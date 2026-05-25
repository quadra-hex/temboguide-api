const router = require('express').Router()
const { protect } = require('../middleware/auth');
const ctrl   = require('../controllers/chatController')
const { authAny } = require('../middleware/auth')
const { uploadImage } = require('../config/cloudinary')

router.get('/',                        authAny, ctrl.getChats)
router.post('/start',                  authAny, ctrl.startChat)
router.get('/:chatId/messages',        authAny, ctrl.getMessages)
router.post('/:chatId/messages',       authAny, uploadImage.single('image'), ctrl.sendMessage)
module.exports = router

