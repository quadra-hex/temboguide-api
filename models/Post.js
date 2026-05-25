const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema({
  author:     { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'authorModel' },
  authorModel:{ type: String, required: true, enum: ['User','Provider'] },
  text:       { type: String, required: true, trim: true },
  likes:      [{ type: mongoose.Schema.Types.ObjectId }],
}, { timestamps: true })

const postSchema = new mongoose.Schema({
  author:      { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'authorModel' },
  authorModel: { type: String, required: true, enum: ['User','Provider'] },
  text:        { type: String, default: '' },
  images:      [{ type: String }],  // cloudinary urls (up to 5)
  likes:       [{ type: mongoose.Schema.Types.ObjectId }],
  comments:    [commentSchema],
  shares:      { type: Number, default: 0 },
  isReported:  { type: Boolean, default: false },
  isHidden:    { type: Boolean, default: false },  // admin can hide
}, { timestamps: true })

module.exports = mongoose.model('Post', postSchema)