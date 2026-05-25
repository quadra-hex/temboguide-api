const jwt      = require('jsonwebtoken')
const Admin    = require('../models/Admin')
const Provider = require('../models/Provider')
const User     = require('../models/User')
const Booking  = require('../models/Booking')
const Service  = require('../models/Service')
const Post     = require('../models/Post')
const { sendProviderApproved, sendProviderRejected } = require('../utils/email')

const signToken = id => jwt.sign({ id, isAdmin: true }, process.env.ADMIN_JWT_SECRET, { expiresIn: '8h' })

// POST /api/admin/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const admin = await Admin.findOne({ email }).select('+password')
    if (!admin || !(await admin.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' })
    res.json({ success: true, token: signToken(admin._id), admin })
  } catch (err) { next(err) }
}

// GET /api/admin/stats
const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers, totalProviders, activeProviders, pendingProviders,
      totalBookings, totalServices, totalPosts,
      recentProviders, recentBookings,
    ] = await Promise.all([
      User.countDocuments(),
      Provider.countDocuments(),
      Provider.countDocuments({ subscriptionStatus: 'active' }),
      Provider.countDocuments({ subscriptionStatus: 'pending_approval' }),
      Booking.countDocuments(),
      Service.countDocuments(),
      Post.countDocuments(),
      Provider.find({ subscriptionStatus: 'pending_approval' }).sort({ createdAt: -1 }).limit(5),
      Booking.find().populate('tourist','name').populate('service','title').sort({ createdAt: -1 }).limit(5),
    ])
    // Monthly revenue estimate
    const activeByCategory = await Provider.aggregate([
      { $match: { subscriptionStatus: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 }, revenue: { $sum: '$subscriptionPrice' } } },
    ])
    res.json({
      success: true,
      stats: {
        totalUsers, totalProviders, activeProviders, pendingProviders,
        totalBookings, totalServices, totalPosts,
        monthlyRevenue: activeByCategory.reduce((s, c) => s + c.revenue, 0),
        revenueByCategory: activeByCategory,
        recentProviders,
        recentBookings,
      },
    })
  } catch (err) { next(err) }
}

// GET /api/admin/providers
const getProviders = async (req, res, next) => {
  try {
    const { status } = req.query
    const filter = status ? { subscriptionStatus: status } : {}
    const providers = await Provider.find(filter).sort({ createdAt: -1 })
    res.json({ success: true, providers })
  } catch (err) { next(err) }
}

// POST /api/admin/providers/:id/approve
const approveProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id)
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' })
    const start = new Date()
    const end   = new Date(start)
    end.setMonth(end.getMonth() + 1)
    provider.subscriptionStatus = 'active'
    provider.subscriptionStart  = start
    provider.subscriptionEnd    = end
    provider.canPost            = true
    provider.isVerified         = true
    provider.adminNote          = ''
    await provider.save()
    // Activate all their services
    await Service.updateMany({ provider: provider._id }, { isActive: true })
    try { await sendProviderApproved(provider) } catch {}
    res.json({ success: true, message: `${provider.businessName} approved and live until ${end.toDateString()}.` })
  } catch (err) { next(err) }
}

// POST /api/admin/providers/:id/reject
const rejectProvider = async (req, res, next) => {
  try {
    const { reason } = req.body
    const provider = await Provider.findById(req.params.id)
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' })
    provider.subscriptionStatus = 'rejected'
    provider.adminNote          = reason || 'Payment could not be verified.'
    provider.canPost            = false
    await provider.save()
    try { await sendProviderRejected(provider, reason) } catch {}
    res.json({ success: true, message: 'Provider rejected and notified.' })
  } catch (err) { next(err) }
}

// POST /api/admin/providers/:id/suspend
const suspendProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id)
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' })
    provider.subscriptionStatus = 'suspended'
    provider.canPost            = false
    await provider.save()
    await Service.updateMany({ provider: provider._id }, { isActive: false })
    res.json({ success: true, message: 'Provider suspended.' })
  } catch (err) { next(err) }
}

// GET /api/admin/bookings
const getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('tourist',  'name email')
      .populate('provider', 'businessName')
      .populate('service',  'title price')
      .sort({ createdAt: -1 })
    res.json({ success: true, bookings })
  } catch (err) { next(err) }
}

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 })
    res.json({ success: true, users })
  } catch (err) { next(err) }
}

// DELETE /api/admin/posts/:id — hide inappropriate post
const hidePost = async (req, res, next) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, { isHidden: true })
    res.json({ success: true, message: 'Post hidden.' })
  } catch (err) { next(err) }
}

module.exports = { login, getStats, getProviders, approveProvider, rejectProvider, suspendProvider, getBookings, getUsers, hidePost }