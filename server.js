require('dotenv').config()

const express   = require('express')
const http      = require('http')
const { Server} = require('socket.io')
const cors      = require('cors')
const cron      = require('node-cron')
const connectDB = require('./config/db')

const profileRoutes = require('./routes/profile')

const {
  helmetMiddleware, apiLimiter, authLimiter,
  sanitizeBody, errorHandler, notFound,
} = require('./middleware/errorHandler')

const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET','POST'] },
})

const PORT = process.env.PORT || 5000

// ── Connect DB ────────────────────────────────────────────────
connectDB()

// ── Middleware ────────────────────────────────────────────────
app.use(helmetMiddleware)
app.use(cors({
  origin:'*',
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(sanitizeBody)

// ── Rate limiting ─────────────────────────────────────────────
app.use('/api', apiLimiter)
app.use('/api/auth/login',     authLimiter)
app.use('/api/auth/register',  authLimiter)
app.use('/api/provider/login', authLimiter)
app.use('/api/admin/login',    authLimiter)

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({
  success:   true,
  message:   'TemboGuide API is running 🌿',
  version:   '1.0.0',
  timestamp: new Date().toISOString(),
}))

// ── Routes ────────────────────────────────────────────────────
app.use('/api', require('./routes/index'))

// ── 404 + Error handler ───────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ── Socket.IO — Real-time chat ────────────────────────────────
const onlineUsers = new Map() // userId → socketId

io.on('connection', (socket) => {
  console.log(`🔌  Socket connected: ${socket.id}`)

  // User comes online
  socket.on('user_online', (userId) => {
    onlineUsers.set(userId, socket.id)
    io.emit('online_users', Array.from(onlineUsers.keys()))
  })

  // Join a chat room
  socket.on('join_chat', (chatId) => {
    socket.join(chatId)
  })

  // Send a message via socket
  socket.on('send_message', async (data) => {
    try {
      const { Chat, Message } = require('./models/Chat')
      const { chatId, senderId, senderModel, text, image } = data

      const message = await Message.create({
        chat: chatId, sender: senderId, senderModel, text, image: image || '',
      })
      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: message._id, lastActivity: new Date(),
      })
      const populated = await Message.findById(message._id)
        .populate({ path: 'sender', select: 'name avatar businessName logo' })

      // Broadcast to everyone in the chat room
      io.to(chatId).emit('new_message', populated)
    } catch (err) {
      socket.emit('error', { message: 'Failed to send message.' })
    }
  })

  // Typing indicator
  socket.on('typing', ({ chatId, userId }) => {
    socket.to(chatId).emit('user_typing', { userId })
  })
  socket.on('stop_typing', ({ chatId, userId }) => {
    socket.to(chatId).emit('user_stop_typing', { userId })
  })

  // Disconnect
  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId)
        break
      }
    }
    io.emit('online_users', Array.from(onlineUsers.keys()))
    console.log(`🔌  Socket disconnected: ${socket.id}`)
  })
})

// ── Cron job — check expired subscriptions daily at midnight ──
cron.schedule('0 0 * * *', async () => {
  try {
    const Provider = require('./models/Provider')
    const Service  = require('./models/Service')
    const expired  = await Provider.find({
      subscriptionStatus: 'active',
      subscriptionEnd: { $lt: new Date() },
    })
    for (const provider of expired) {
      provider.subscriptionStatus = 'expired'
      provider.canPost            = false
      await provider.save()
      await Service.updateMany({ provider: provider._id }, { isActive: false })
      console.log(`⏰  Subscription expired: ${provider.businessName}`)
    }
    if (expired.length > 0) {
      console.log(`✅  Cron: ${expired.length} subscriptions expired.`)
    }
  } catch (err) {
    console.error('Cron error:', err.message)
  }
})

// ── Start server ──────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🌿  TemboGuide API running`)
  console.log(`📡  http://localhost:${PORT}`)
  console.log(`🔍  Health: http://localhost:${PORT}/api/health\n`)
})

process.on('SIGTERM', () => { console.log('Shutting down...'); process.exit(0) })
process.on('uncaughtException',  err => { console.error('Uncaught:', err.message); process.exit(1) })
process.on('unhandledRejection', err => { console.error('Unhandled:', err);        process.exit(1) })