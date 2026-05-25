const Booking  = require('../models/Booking')
const Service  = require('../models/Service')
const Provider = require('../models/Provider')
const { sendBookingNotification } = require('../utils/email')

// GET /api/bookings/services — browse all active services (tourists)
const getServices = async (req, res, next) => {
  try {
    const { category, minPrice, maxPrice, location } = req.query
    const filter = { isActive: true, isAvailable: true }
    if (category) filter.category = category
    if (location) filter.location = { $regex: location, $options: 'i' }
    if (minPrice || maxPrice) {
      filter.price = {}
      if (minPrice) filter.price.$gte = Number(minPrice)
      if (maxPrice) filter.price.$lte = Number(maxPrice)
    }
    const services = await Service.find(filter)
      .populate('provider', 'businessName logo rating reviewCount isVerified location')
      .sort({ rating: -1, createdAt: -1 })
    res.json({ success: true, services })
  } catch (err) { next(err) }
}

// GET /api/bookings/services/:id — single service detail
const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('provider', 'businessName logo description location phone rating reviewCount isVerified')
    if (!service || !service.isActive)
      return res.status(404).json({ success: false, message: 'Service not found.' })
    res.json({ success: true, service })
  } catch (err) { next(err) }
}

// POST /api/bookings/create — tourist creates a booking
const createBooking = async (req, res, next) => {
  try {
    const { serviceId, checkIn, checkOut, guests, message } = req.body
    const service = await Service.findById(serviceId).populate('provider')
    if (!service || !service.isActive)
      return res.status(404).json({ success: false, message: 'Service not found or unavailable.' })
    if (!service.provider || service.provider.subscriptionStatus !== 'active')
      return res.status(400).json({ success: false, message: 'This provider is currently inactive.' })

    // Calculate nights & price
    const nights     = checkOut
      ? Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000)
      : 1
    const totalPrice = service.price * nights * guests

    const booking = await Booking.create({
      tourist:    req.user._id,
      provider:   service.provider._id,
      service:    serviceId,
      checkIn:    new Date(checkIn),
      checkOut:   checkOut ? new Date(checkOut) : undefined,
      guests,
      message:    message || '',
      totalPrice,
    })

    // Update provider booking count
    await Provider.findByIdAndUpdate(service.provider._id, { $inc: { totalBookings: 1 } })
    await Service.findByIdAndUpdate(serviceId, { $inc: { totalBookings: 1 } })

    try { await sendBookingNotification(booking, service, req.user, service.provider) } catch {}

    res.status(201).json({
      success: true,
      message: 'Booking request sent! The provider will confirm shortly.',
      booking,
    })
  } catch (err) { next(err) }
}

// GET /api/bookings/my — tourist sees their bookings
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ tourist: req.user._id })
      .populate('service',  'title images price priceUnit')
      .populate('provider', 'businessName logo phone')
      .sort({ createdAt: -1 })
    res.json({ success: true, bookings })
  } catch (err) { next(err) }
}

// DELETE /api/bookings/:id/cancel — tourist cancels pending booking
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' })
    if (booking.tourist.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Forbidden.' })
    if (booking.status !== 'pending')
      return res.status(400).json({ success: false, message: `Cannot cancel a ${booking.status} booking.` })
    booking.status = 'cancelled'
    await booking.save()
    res.json({ success: true, message: 'Booking cancelled.' })
  } catch (err) { next(err) }
}

// POST /api/bookings/:id/review — tourist leaves review after completion
const leaveReview = async (req, res, next) => {
  try {
    const { rating, review } = req.body
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' })
    if (booking.tourist.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Forbidden.' })
    if (booking.status !== 'completed')
      return res.status(400).json({ success: false, message: 'Can only review completed bookings.' })
    if (booking.touristRating)
      return res.status(400).json({ success: false, message: 'Already reviewed.' })

    booking.touristRating = rating
    booking.touristReview = review || ''
    booking.reviewedAt    = new Date()
    await booking.save()

    // Update service & provider rating
    const service  = await Service.findById(booking.service)
    const allReviews = await Booking.find({ service: booking.service, touristRating: { $exists: true } })
    const avgRating  = allReviews.reduce((s, b) => s + b.touristRating, 0) / allReviews.length
    await Service.findByIdAndUpdate(booking.service, { rating: avgRating, reviewCount: allReviews.length })
    await Provider.findByIdAndUpdate(booking.provider, { rating: avgRating, reviewCount: allReviews.length })

    res.json({ success: true, message: 'Review submitted. Thank you!' })
  } catch (err) { next(err) }
}

// ── Provider booking management ────────────────────────────────

// GET /api/bookings/provider — provider sees their bookings
const getProviderBookings = async (req, res, next) => {
  try {
    const { status } = req.query
    const filter = { provider: req.provider._id }
    if (status) filter.status = status
    const bookings = await Booking.find(filter)
      .populate('tourist', 'name email phone avatar')
      .populate('service', 'title price priceUnit images')
      .sort({ createdAt: -1 })
    res.json({ success: true, bookings })
  } catch (err) { next(err) }
}

// POST /api/bookings/:id/confirm — provider confirms booking
const confirmBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' })
    if (booking.provider.toString() !== req.provider._id.toString())
      return res.status(403).json({ success: false, message: 'Forbidden.' })
    if (booking.status !== 'pending')
      return res.status(400).json({ success: false, message: `Booking is already ${booking.status}.` })
    booking.status       = 'confirmed'
    booking.providerNote = req.body.note || ''
    await booking.save()
    res.json({ success: true, message: 'Booking confirmed.' })
  } catch (err) { next(err) }
}

// POST /api/bookings/:id/reject — provider rejects booking
const rejectBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' })
    if (booking.provider.toString() !== req.provider._id.toString())
      return res.status(403).json({ success: false, message: 'Forbidden.' })
    if (booking.status !== 'pending')
      return res.status(400).json({ success: false, message: `Booking is already ${booking.status}.` })
    booking.status       = 'rejected'
    booking.providerNote = req.body.reason || ''
    await booking.save()
    res.json({ success: true, message: 'Booking rejected.' })
  } catch (err) { next(err) }
}

// POST /api/bookings/:id/complete — provider marks booking complete
const completeBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' })
    if (booking.provider.toString() !== req.provider._id.toString())
      return res.status(403).json({ success: false, message: 'Forbidden.' })
    booking.status = 'completed'
    await booking.save()
    await Provider.findByIdAndUpdate(req.provider._id, { $inc: { completedBookings: 1 } })
    res.json({ success: true, message: 'Booking marked as completed.' })
  } catch (err) { next(err) }
}

module.exports = {
  getServices, getServiceById, createBooking, getMyBookings,
  cancelBooking, leaveReview, getProviderBookings,
  confirmBooking, rejectBooking, completeBooking,
}