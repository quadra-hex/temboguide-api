const Post  = require('../models/Post')
const Story = require('../models/Story')
const User  = require('../models/User') // 🔥 Added this so .find() won't crash!
const { uploadToCloudinary } = require('../config/cloudinary')

// ── MEMBERS DIRECTORY ──────────────────────────────────────────

const getMembers = async (req, res, next) => {
  try {
    // 1. Get the current logged-in user's ID
    const myId = req.user?._id || req.provider?._id;

    if (!myId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    // 2. Find all other users except yourself so you can start a chat
    const members = await User.find(
      { _id: { $ne: myId } },
      'name avatar bio isVerified' // Only return fields needed for a user-list UI card
    ).sort({ name: 1 }); // Sorted alphabetically

    res.json({ success: true, count: members.length, members });
  } catch (err) { next(err) }
}

// ── POSTS ──────────────────────────────────────────────────────

const getPosts = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1
    const limit = parseInt(req.query.limit) || 10
    const posts = await Post.find({ isHidden: false })
      .populate({ path: 'author', select: 'name avatar businessName logo isVerified' })
      .populate({ path: 'comments.author', select: 'name avatar businessName logo' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    res.json({ success: true, posts, page, hasMore: posts.length === limit })
  } catch (err) { next(err) }
}

const createPost = async (req, res, next) => {
  try {
    const { text } = req.body
    const authorId    = req.user?._id || req.provider?._id
    const authorModel = req.actorModel

    // Upload images to Cloudinary
    let images = []
    if (req.files?.length) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'posts')
        images.push(result.secure_url)
      }
    }

    if (!text && !images.length)
      return res.status(400).json({ success: false, message: 'Post must have text or at least one image.' })

    const post = await Post.create({ author: authorId, authorModel, text, images })
    const populated = await Post.findById(post._id)
      .populate({ path: 'author', select: 'name avatar businessName logo isVerified' })
    res.status(201).json({ success: true, post: populated })
  } catch (err) { next(err) }
}

const likePost = async (req, res, next) => {
  try {
    const post   = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' })
    const userId = req.user?._id || req.provider?._id
    const liked  = post.likes.some(id => id.toString() === userId.toString())
    if (liked) {
      post.likes = post.likes.filter(id => id.toString() !== userId.toString())
    } else {
      post.likes.push(userId)
    }
    await post.save()
    res.json({ success: true, liked: !liked, likeCount: post.likes.length })
  } catch (err) { next(err) }
}

const addComment = async (req, res, next) => {
  try {
    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment text required.' })
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' })
    const authorId    = req.user?._id || req.provider?._id
    const authorModel = req.actorModel
    post.comments.push({ author: authorId, authorModel, text })
    await post.save()
    const updated = await Post.findById(post._id)
      .populate({ path: 'comments.author', select: 'name avatar businessName logo' })
    res.json({ success: true, comments: updated.comments })
  } catch (err) { next(err) }
}

const sharePost = async (req, res, next) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, { $inc: { shares: 1 } })
    res.json({ success: true, message: 'Share counted.' })
  } catch (err) { next(err) }
}

const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' })
    const authorId = req.user?._id || req.provider?._id
    if (post.author.toString() !== authorId.toString())
      return res.status(403).json({ success: false, message: 'Forbidden.' })
    await post.deleteOne()
    res.json({ success: true, message: 'Post deleted.' })
  } catch (err) { next(err) }
}

const reportPost = async (req, res, next) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, { isReported: true })
    res.json({ success: true, message: 'Post reported. Our team will review it.' })
  } catch (err) { next(err) }
}

// ── STORIES ─────────────────────────────────────────────────────

const getStories = async (req, res, next) => {
  try {
    const stories = await Story.find({ isActive: true, expiresAt: { $gt: new Date() } })
      .populate({ path: 'author', select: 'name avatar businessName logo isVerified' })
      .sort({ createdAt: -1 })
    res.json({ success: true, stories })
  } catch (err) { next(err) }
}

const createStory = async (req, res, next) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'Media file required for story.' })

    const authorId    = req.user?._id || req.provider?._id
    const authorModel = req.actorModel
    const isVideo     = req.file.mimetype.startsWith('video')

    const result = await uploadToCloudinary(
      req.file.buffer,
      'stories',
      isVideo ? 'video' : 'image'
    )

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const story = await Story.create({
      author:    authorId,
      authorModel,
      mediaUrl:  result.secure_url,
      mediaType: isVideo ? 'video' : 'image',
      caption:   req.body.caption || '',
      expiresAt,
    })
    res.status(201).json({ success: true, story })
  } catch (err) { next(err) }
}

const viewStory = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.provider?._id
    await Story.findByIdAndUpdate(req.params.id, { $addToSet: { viewers: userId } })
    res.json({ success: true })
  } catch (err) { next(err) }
}

module.exports = {
  getMembers, // 🔥 Added here
  getPosts, createPost, likePost, addComment, sharePost,
  deletePost, reportPost, getStories, createStory, viewStory,
}