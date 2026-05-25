const Service  = require('../models/Service')
const { uploadToCloudinary } = require('../config/cloudinary')

const getMyServices = async (req, res, next) => {
  try {
    const services = await Service.find({ provider: req.provider._id }).sort({ createdAt: -1 })
    res.json({ success: true, services })
  } catch (err) { next(err) }
}

const createService = async (req, res, next) => {
  try {
    const { title, description, price, priceUnit, location, amenities, capacity } = req.body
    let images = []
    if (req.files?.length) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'services')
        images.push(result.secure_url)
      }
    }
    const service = await Service.create({
      provider:   req.provider._id,
      category:   req.provider.category,
      title, description, price, priceUnit,
      location:   location || req.provider.location,
      images,
      amenities:  amenities ? JSON.parse(amenities) : [],
      capacity:   capacity || 1,
    })
    res.status(201).json({ success: true, message: 'Service listed!', service })
  } catch (err) { next(err) }
}

const updateService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id)
    if (!service) return res.status(404).json({ success: false, message: 'Service not found.' })
    if (service.provider.toString() !== req.provider._id.toString())
      return res.status(403).json({ success: false, message: 'Forbidden.' })
    const { title, description, price, priceUnit, location, amenities, capacity, isAvailable } = req.body
    const update = { title, description, price, priceUnit, location, capacity, isAvailable }
    if (amenities) update.amenities = JSON.parse(amenities)
    if (req.files?.length) {
      update.images = []
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'services')
        update.images.push(result.secure_url)
      }
    }
    await Service.findByIdAndUpdate(req.params.id, update)
    res.json({ success: true, message: 'Service updated.' })
  } catch (err) { next(err) }
}

const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id)
    if (!service) return res.status(404).json({ success: false, message: 'Service not found.' })
    if (service.provider.toString() !== req.provider._id.toString())
      return res.status(403).json({ success: false, message: 'Forbidden.' })
    await service.deleteOne()
    res.json({ success: true, message: 'Service deleted.' })
  } catch (err) { next(err) }
}

module.exports = { getMyServices, createService, updateService, deleteService }

const getAllServices = async (req, res, next) => {
  try {
    const { category, location, search } = req.query
    const filter = { isAvailable: true, isActive: true }
    
    if (category) filter.category = category
    if (location) filter.location = new RegExp(location, 'i') // case-insensitive search
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ]
    }
    
    const services = await Service.find(filter)
      .populate('provider', 'name businessName location category')
      .sort({ createdAt: -1 })
    
    res.json({ success: true, services })
  } catch (err) { next(err) }
}

module.exports = { getMyServices, createService, updateService, deleteService, getAllServices }
