const mongoose = require('mongoose')

const serviceSchema = new mongoose.Schema({
  provider:    { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  title:       { type: String, required: true, trim: true },
  category:    { type: String, required: true,
                 enum: ['Tour Company','Hotel','Restaurant','Camping Site','Homestay'] },
  description: { type: String, required: true },
  price:       { type: Number, required: true },
  priceUnit:   { type: String, default: 'per night',
                 enum: ['per night','per person','per day','per tour','per meal'] },
  location:    { type: String, required: true },
  images:      [{ type: String }],   // cloudinary urls (up to 5)
  amenities:   [{ type: String }],   // wifi, parking, pool etc
  capacity:    { type: Number, default: 1 },
  isAvailable: { type: Boolean, default: true },
  isActive:    { type: Boolean, default: true }, // false if provider subscription expires

  // Stats
  rating:      { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  totalBookings:{ type: Number, default: 0 },
}, { timestamps: true })

module.exports = mongoose.model('Service', serviceSchema)