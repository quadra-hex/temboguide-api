const rateLimit = require('express-rate-limit')
const helmet    = require('helmet')

const helmetMiddleware = helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false })

const limiter = (max, msg) => rateLimit({
  windowMs: 15 * 60 * 1000, max,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: msg },
})

const apiLimiter      = limiter(200, 'Too many requests. Please try again later.')
const authLimiter     = rateLimit({ ...limiter(10, 'Too many login attempts.'), skipSuccessfulRequests: true })
const uploadLimiter   = limiter(20, 'Too many uploads. Please slow down.')

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim()
      }
    }
  }
  next()
}

const errorHandler = (err, req, res, next) => {
  const status  = err.status || err.statusCode || 500
  const message = status < 500 ? err.message : 'Internal server error'
  console.error(`[ERROR] ${req.method} ${req.originalUrl} — ${err.message}`)
  res.status(status).json({ success: false, message })
}

const notFound = (req, res, next) => {
  const err = new Error(`Not found: ${req.method} ${req.originalUrl}`)
  err.status = 404
  next(err)
}

module.exports = { helmetMiddleware, apiLimiter, authLimiter, uploadLimiter, sanitizeBody, errorHandler, notFound }