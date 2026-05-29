const router = require('express').Router();
const ctrl   = require('../controllers/chatController');
const { authAny } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');

// ── Conversation Core Endpoints ────────────────────────────────
router.get('/',                        authAny, ctrl.getChats);
router.post('/start',                  authAny, ctrl.startChat);

// ── Message Handlers ───────────────────────────────────────────
router.get('/:chatId/messages',        authAny, ctrl.getMessages);
router.post('/:chatId/messages',       authAny, uploadImage.single('image'), ctrl.sendMessage);

module.exports = router;

