const express = require('express')
app.set('trust proxy', 1); // <-- Add this line!
const router = express.Router()
const User = require('../models/User')
const Provider = require('../models/Provider')
const { authUser, authProvider } = require('../middleware/auth')

// ═══════════════════════════════════════════════════════════
//  UPDATE USER PROFILE (avatar, bio, phone)
// ═══════════════════════════════════════════════════════════
router.put('/user', authUser, async (req, res) => {
  try {
    const { avatar, bio, phone } = req.body
    const userId = req.user._id

    console.log(`📝 Updating user profile for: ${userId}`)
    console.log(`  avatar: ${avatar}`)
    console.log(`  bio: ${bio}`)
    console.log(`  phone: ${phone}`)

    // Validate avatar URL if provided
    if (avatar && !avatar.startsWith('http')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid avatar URL'
      })
    }

    // Update only provided fields
    const updateData = {}
    if (avatar !== undefined) updateData.avatar = avatar
    if (bio !== undefined) updateData.bio = bio
    if (phone !== undefined) updateData.phone = phone

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    console.log(`✅ User profile updated`)
    console.log(`  Updated data: ${JSON.stringify(updateData)}`)

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    })
  } catch (error) {
    console.error(`❌ Error updating user profile: ${error.message}`)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile'
    })
  }
})

// ═══════════════════════════════════════════════════════════
//  UPDATE PROVIDER PROFILE (avatar, bio, phone)
// ═══════════════════════════════════════════════════════════
router.put('/provider', authProvider, async (req, res) => {
  try {
    const { avatar, bio, phone } = req.body
    const providerId = req.provider._id

    console.log(`📝 Updating provider profile for: ${providerId}`)
    console.log(`  avatar: ${avatar}`)
    console.log(`  bio: ${bio}`)
    console.log(`  phone: ${phone}`)

    // Validate avatar URL if provided
    if (avatar && !avatar.startsWith('http')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid avatar URL'
      })
    }

    // Update only provided fields
    const updateData = {}
    if (avatar !== undefined) updateData.avatar = avatar
    if (bio !== undefined) updateData.bio = bio
    if (phone !== undefined) updateData.phone = phone

    const updatedProvider = await Provider.findByIdAndUpdate(
      providerId,
      updateData,
      { new: true, runValidators: true }
    )

    if (!updatedProvider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      })
    }

    console.log(`✅ Provider profile updated`)
    console.log(`  Updated data: ${JSON.stringify(updateData)}`)

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProvider
    })
  } catch (error) {
    console.error(`❌ Error updating provider profile: ${error.message}`)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile'
    })
  }
})

// ═══════════════════════════════════════════════════════════
//  GET USER PROFILE
// ═══════════════════════════════════════════════════════════
router.get('/user', authUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      data: user
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// ═══════════════════════════════════════════════════════════
//  GET PROVIDER PROFILE
// ═══════════════════════════════════════════════════════════
router.get('/provider', authProvider, async (req, res) => {
  try {
    const provider = await Provider.findById(req.provider._id)
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      })
    }

    res.json({
      success: true,
      data: provider
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

module.exports = router
