const mongoose = require('mongoose');

// ── Individual message ────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  chat:        { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender:      { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'senderModel' },
  senderModel: { type: String, required: true, enum: ['User','Provider'] },
  text:        { type: String, default: '' },
  image:       { type: String, default: '' },   // cloudinary url
  isRead:      { type: Boolean, default: false },
  readAt:      { type: Date },
}, { timestamps: true })

// ── Conversation thread between two participants ──────────────
const chatSchema = new mongoose.Schema({
  participants: [{
    participant:      { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'participants.participantModel' },
    participantModel: { type: String, required: true, enum: ['User','Provider'] },
  }],
  lastMessage:  { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastActivity: { type: Date, default: Date.now },
}, { timestamps: true })

const Chat    = mongoose.model('Chat',    chatSchema)
const Message = mongoose.model('Message', messageSchema)

module.exports = { Chat, Message }