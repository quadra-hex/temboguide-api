const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

// Subscription prices in TZS
const PRICES = {
  'Tour Company': 25000,
  'Hotel':        25000,
  'Restaurant':   20000,
  'Camping Site': 10000,
  'Homestay':     10000,
}

const providerSchema = new mongoose.Schema({
  // ── Auth ──────────────────────────────────────────────────────
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:      { type: String, required: true },
  phone:         { type: String, required: true },

  // ── Business info ─────────────────────────────────────────────
  businessName:  { type: String, required: true, trim: true },
  category:      { type: String, required: true,
                   enum: ['Tour Company','Hotel','Restaurant','Camping Site','Homestay'] },
  description:   { type: String, default: '' },
  location:      { type: String, default: '' },
  address:       { type: String, default: '' },
  logo:          { type: String, default: '' },       // cloudinary url
  coverImage:    { type: String, default: '' },       // cloudinary url
  gallery:       [{ type: String }],                  // cloudinary urls

  // ── Subscription ──────────────────────────────────────────────
  subscriptionStatus: {
    type: String,
    enum: ['pending_payment', 'pending_approval', 'active', 'expired', 'suspended', 'rejected'],
    default: 'pending_payment',
  },
  subscriptionPrice:   { type: Number },  // auto-set from category
  subscriptionStart:   { type: Date },
  subscriptionEnd:     { type: Date },

  // ── Payment proof ─────────────────────────────────────────────
  paymentProof:        { type: String, default: '' },  // cloudinary url
  paymentDate:         { type: Date },
  paymentReference:    { type: String, default: '' },  // bank ref number
  adminNote:           { type: String, default: '' },  // admin rejection reason

  // ── Community permissions ─────────────────────────────────────
  canPost:    { type: Boolean, default: false },  // true only when active
  isVerified: { type: Boolean, default: false },  // verified badge

  // ── Stats ──────────────────────────────────────────────────────
  totalBookings:    { type: Number, default: 0 },
  completedBookings:{ type: Number, default: 0 },
  rating:           { type: Number, default: 0 },
  reviewCount:      { type: Number, default: 0 },

}, { timestamps: true })

// Auto-set subscription price from category
providerSchema.pre('save', async function(next) {
  if (this.isModified('category') || this.isNew) {
    this.subscriptionPrice = PRICES[this.category] || 0
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
  }
  // Sync canPost with subscription status
  this.canPost = this.subscriptionStatus === 'active'
  next()
})

providerSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password)
}

providerSchema.set('toJSON', {
  transform(doc, ret) { delete ret.password; return ret }
})

module.exports = mongoose.model('Provider', providerSchema)
module.exports.PRICES = PRICES