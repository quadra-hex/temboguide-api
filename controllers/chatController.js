const { Chat, Message } = require('../models/Chat')

// GET /api/chat — get all conversations for current user/provider
const getChats = async (req, res, next) => {
  try {
    const userId    = req.user?._id || req.provider?._id
    const userModel = req.actorModel
    const chats = await Chat.find({
      'participants.participant': userId,
      'participants.participantModel': userModel,
    })
      .populate({ path: 'participants.participant', select: 'name avatar businessName logo' })
      .populate({ path: 'lastMessage' })
      .sort({ lastActivity: -1 })
    res.json({ success: true, chats })
  } catch (err) { next(err) }
}

/// POST /api/chat/start — start or get existing conversation
const startChat = async (req, res, next) => {
  try {
    const { participantId, participantModel } = req.body
    const myId    = req.user?._id || req.provider?._id
    const myModel = req.actorModel

    if (!participantId || !participantModel) {
      return res.status(400).json({ success: false, message: 'Participant ID and Model type are required.' })
    }

    // ✅ FIXED: Using $all with $elemMatch guarantees it finds the EXACT private chat between you two
    const existing = await Chat.findOne({
      participants: {
        $all: [
          { $elemMatch: { participant: myId } },
          { $elemMatch: { participant: participantId } }
        ]
      }
    }).populate({ path: 'participants.participant', select: 'name avatar businessName logo' })

    // If chat already exists, return it so Flutter can load the conversation thread
    if (existing) return res.json({ success: true, chat: existing })

    // If it doesn't exist, build a new chat room document
    const chat = await Chat.create({
      participants: [
        { participant: myId,          participantModel: myModel },
        { participant: participantId, participantModel },
      ],
    })
    
    const populated = await Chat.findById(chat._id)
      .populate({ path: 'participants.participant', select: 'name avatar businessName logo' })
      
    res.status(201).json({ success: true, chat: populated })
  } catch (err) { next(err) }
}

// GET /api/chat/:chatId/messages — get messages in a chat
const getMessages = async (req, res, next) => {
  try {
    const page     = parseInt(req.query.page) || 1
    const limit    = 30
    const messages = await Message.find({ chat: req.params.chatId })
      .populate({ path: 'sender', select: 'name avatar businessName logo' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    // Mark messages as read
    const userId = req.user?._id || req.provider?._id
    await Message.updateMany(
      { chat: req.params.chatId, sender: { $ne: userId }, isRead: false },
      { isRead: true, readAt: new Date() },
    )
    res.json({ success: true, messages: messages.reverse(), hasMore: messages.length === limit })
  } catch (err) { next(err) }
}

// POST /api/chat/:chatId/messages — send a message (REST fallback)
const sendMessage = async (req, res, next) => {
  try {
    const { text }  = req.body
    const image     = req.file?.path || ''
    const senderId  = req.user?._id || req.provider?._id
    const senderModel = req.actorModel
    if (!text && !image)
      return res.status(400).json({ success: false, message: 'Message must have text or image.' })
    const message = await Message.create({
      chat:    req.params.chatId,
      sender:  senderId,
      senderModel,
      text,
      image,
    })
    await Chat.findByIdAndUpdate(req.params.chatId, {
      lastMessage:  message._id,
      lastActivity: new Date(),
    })
    const populated = await Message.findById(message._id)
      .populate({ path: 'sender', select: 'name avatar businessName logo' })
    res.status(201).json({ success: true, message: populated })
  } catch (err) { next(err) }
}

module.exports = { getChats, startChat, getMessages, sendMessage }