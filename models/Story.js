const mongoose = require('mongoose')

const storySchema = new mongoose.Schema({
  author:      { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'authorModel' },
  authorModel: { type: String, required: true, enum: ['User','Provider'] },
  mediaUrl:    { type: String, required: true },   // cloudinary url
  mediaType:   { type: String, required: true, enum: ['image','video'] },
  caption:     { type: String, default: '' },
  viewers:     [{ type: mongoose.Schema.Types.ObjectId }],  // who viewed
  expiresAt:   { type: Date, required: true },  // 24hrs from creation
  isActive:    { type: Boolean, default: true },
}, { timestamps: true })

// Auto-expire index — MongoDB deletes docs when expiresAt passes
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('Story', storySchema)