const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const adminSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name:     { type: String, default: 'TemboGuide Admin' },
}, { timestamps: true })

adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

adminSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.password)
}

adminSchema.set('toJSON', {
  transform(doc, ret) { delete ret.password; return ret }
})

module.exports = mongoose.model('Admin', adminSchema)