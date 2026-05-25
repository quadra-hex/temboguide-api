const jwt      = require('jsonwebtoken')
const User     = require('../models/User')
const Provider = require('../models/Provider')
const Admin    = require('../models/Admin')

// ── Tourist auth ──────────────────────────────────────────────
const authUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ success: false, message: 'No token provided.' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id).select('-password')
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found.' })
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' })
  }
}

// ── Provider auth ─────────────────────────────────────────────
const authProvider = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ success: false, message: 'No token provided.' })
  try {
    const decoded = jwt.verify(token, process.env.PROVIDER_JWT_SECRET)
    req.provider = await Provider.findById(decoded.id).select('-password')
    if (!req.provider) return res.status(401).json({ success: false, message: 'Provider not found.' })
    if (req.provider.subscriptionStatus !== 'active') {
      return res.status(403).json({ success: false, message: 'Your subscription is not active.' })
    }
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' })
  }
}

// ── Provider auth (any status — for dashboard access) ─────────
const authProviderAny = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ success: false, message: 'No token provided.' })
  try {
    const decoded = jwt.verify(token, process.env.PROVIDER_JWT_SECRET)
    req.provider = await Provider.findById(decoded.id).select('-password')
    if (!req.provider) return res.status(401).json({ success: false, message: 'Provider not found.' })
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' })
  }
}

// ── Admin auth ────────────────────────────────────────────────
const authAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ success: false, message: 'No token provided.' })
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET)
    if (!decoded.isAdmin) return res.status(403).json({ success: false, message: 'Admin access required.' })
    req.admin = await Admin.findById(decoded.id).select('-password')
    if (!req.admin) return res.status(401).json({ success: false, message: 'Admin not found.' })
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' })
  }
}

// ── Either tourist or approved provider (for community) ───────
const authAny = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ success: false, message: 'No token provided.' })
  try {
    // Try user token first
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = await User.findById(decoded.id).select('-password')
      if (req.user) { req.actorModel = 'User'; return next() }
    } catch {}
    // Try provider token
    const decoded = jwt.verify(token, process.env.PROVIDER_JWT_SECRET)
    req.provider = await Provider.findById(decoded.id).select('-password')
    if (!req.provider) throw new Error()
    if (!req.provider.canPost) {
      return res.status(403).json({ success: false, message: 'Your account must be active to post.' })
    }
    req.actorModel = 'Provider'
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' })
  }
}

module.exports = { authUser, authProvider, authProviderAny, authAdmin, authAny }