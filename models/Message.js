const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderModel',
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['User', 'Provider', 'Admin'],
  },
  content: {
    type: String,
    trim: true,
  },
  mediaUrl: {
    type: String,
    default: '',
  },
  mediaType: {
    type: String,
    enum: ['none', 'image', 'video', 'audio', 'file'],
    default: 'none',
  },
  readBy: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'readBy.userModel',
      },
      userModel: {
        type: String,
        enum: ['User', 'Provider', 'Admin'],
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true })

// Mark message as read by a user
messageSchema.methods.markRead = function (userId, userModel) {
  const alreadyRead = this.readBy.some(
    (r) => r.user.toString() === userId.toString()
  )
  if (!alreadyRead) {
    this.readBy.push({ user: userId, userModel, readAt: new Date() })
  }
  return this.save()
}

module.exports = mongoose.model('Message', messageSchema)
