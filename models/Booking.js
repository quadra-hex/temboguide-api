const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema({
  tourist:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  provider:  { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  service:   { type: mongoose.Schema.Types.ObjectId, ref: 'Service',  required: true },

  // Booking details
  checkIn:   { type: Date, required: true },
  checkOut:  { type: Date },
  guests:    { type: Number, required: true, min: 1 },
  message:   { type: String, default: '' },

  // Pricing
  totalPrice:{ type: Number, required: true },
  currency:  { type: String, default: 'TZS' },

  // Status flow: pending → confirmed → completed / rejected / cancelled
  status: {
    type: String,
    enum: ['pending','confirmed','completed','rejected','cancelled'],
    default: 'pending',
  },

  providerNote:  { type: String, default: '' }, // provider accept/reject message
  touristRating: { type: Number, min: 1, max: 5 },
  touristReview: { type: String, default: '' },
  reviewedAt:    { type: Date },
}, { timestamps: true })

module.exports = mongoose.model('Booking', bookingSchema)