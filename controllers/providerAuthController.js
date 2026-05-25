const jwt      = require('jsonwebtoken');
const Provider = require('../models/Provider');
const { sendProviderRegistered } = require('../utils/email');

const signToken = id => jwt.sign({ id }, process.env.PROVIDER_JWT_SECRET, { expiresIn: '30d' });

// POST /api/provider/register (Auto-approve, skip payment)
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, businessName, category, description, location, address } = req.body;
    if (await Provider.findOne({ email }))
      return res.status(409).json({ success: false, message: 'Email already registered.' });

    const provider = await Provider.create({
      name, email, password, phone, businessName,
      category, description, location, address,
      subscriptionStatus: 'active',   // Auto-approved!
      canPost: true,
      isVerified: true,
      subscriptionStart: new Date(),
      subscriptionEnd: new Date('2099-12-31'),
    });

    const token = signToken(provider._id);
    try { await sendProviderRegistered(provider); } catch {}

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your provider account is now active.',
      token,
      provider,
    });
  } catch (err) { next(err); }
};

// POST /api/provider/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const provider = await Provider.findOne({ email }).select('+password');
    if (!provider || !(await provider.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const token = signToken(provider._id);
    const safe = await Provider.findById(provider._id);
    res.json({ success: true, token, provider: safe });
  } catch (err) { next(err); }
};

// GET /api/provider/dashboard — provider sees their own data
const getDashboard = async (req, res, next) => {
  try {
    const Booking = require('../models/Booking');
    const Service = require('../models/Service');
    const [provider, services, bookings] = await Promise.all([
      Provider.findById(req.provider._id),
      Service.find({ provider: req.provider._id }),
      Booking.find({ provider: req.provider._id })
        .populate('tourist', 'name email phone')
        .populate('service', 'title price')
        .sort({ createdAt: -1 }),
    ]);
    const stats = {
      totalBookings:    bookings.length,
      pendingBookings:  bookings.filter(b => b.status === 'pending').length,
      confirmedBookings:bookings.filter(b => b.status === 'confirmed').length,
      completedBookings:bookings.filter(b => b.status === 'completed').length,
      totalRevenue:     bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.totalPrice, 0),
    };
    res.json({ success: true, provider, services, bookings, stats });
  } catch (err) { next(err); }
};

// PUT /api/provider/profile — update business info
const updateProfile = async (req, res, next) => {
  try {
    const { businessName, description, location, address, phone } = req.body;
    const update = { businessName, description, location, address, phone };
    if (req.file) update.logo = req.file.path;
    await Provider.findByIdAndUpdate(req.provider._id, update);
    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) { next(err); }
};

module.exports = { register, login, getDashboard, updateProfile };