require('dotenv').config()
const mongoose = require('mongoose')
const Admin    = require('../models/Admin')

async function seed() {
  console.log('\n🌱  Seeding TemboGuide database...\n')
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅  MongoDB connected')

    const email    = process.env.ADMIN_EMAIL    || 'ssontz2019@gmail.com'
    const password = process.env.ADMIN_PASSWORD || 'Admin@1234'

    const existing = await Admin.findOne({ email })
    if (existing) {
      console.log(`⏭️   Admin already exists (${email})`)
    } else {
      await Admin.create({ email, password, name: 'TemboGuide Admin' })
      console.log(`✅  Admin created: ${email}`)
      console.log(`🔑  Password: ${password}`)
      console.log(`⚠️   Change this password after first login!\n`)
    }

    console.log('\n🌿  Seed complete!\n')
    console.log('Subscription prices:')
    console.log('  Tour Company: TZS 25,000/month')
    console.log('  Hotel:        TZS 25,000/month')
    console.log('  Restaurant:   TZS 20,000/month')
    console.log('  Camping Site: TZS 10,000/month')
    console.log('  Homestay:     TZS 10,000/month\n')
  } catch (err) {
    console.error('❌  Seed failed:', err.message)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

seed()