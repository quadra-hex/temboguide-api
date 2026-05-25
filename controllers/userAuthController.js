const jwt  = require('jsonwebtoken')
const User = require('../models/User')
const { sendWelcomeUser } = require('../utils/email')
const { uploadToCloudinary } = require('../config/cloudinary')

const signToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body
    if (await User.findOne({ email }))
      return res.status(409).json({ success: false, message: 'Email already registered.' })
    const user  = await User.create({ name, email, password, phone })
    const token = signToken(user._id)
    try { await sendWelcomeUser(user) } catch {}
    res.status(201).json({ success: true, message: 'Account created!', token, user })
  } catch (err) { next(err) }
}

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password.' })
    const token = signToken(user._id)
    const safe  = await User.findById(user._id)
    res.json({ success: true, token, user: safe })
  } catch (err) { next(err) }
}

const getProfile = async (req, res, next) => {
  try {
    res.json({ success: true, user: req.user })
  } catch (err) { next(err) }
}

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, bio } = req.body
    const update = {}
    if (name)  update.name  = name
    if (phone) update.phone = phone
    if (bio !== undefined) update.bio = bio

    // ✅ Handle avatar image upload to Cloudinary
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'avatars')
      update.avatar = result.secure_url
    }

    const user = await User.findByIdAndUpdate(
      req.user._id, update, { new: true })
    res.json({ success: true, message: 'Profile updated.', user })
  } catch (err) { next(err) }
}

module.exports = { register, login, getProfile, updateProfile }
