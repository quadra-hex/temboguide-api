const router = require('express').Router()
const ctrl   = require('../controllers/userAuthController')
const { authUser } = require('../middleware/auth')
const { uploadImage } = require('../config/cloudinary')

router.post('/register', ctrl.register)
router.post('/login',    ctrl.login)
router.get('/profile',   authUser, ctrl.getProfile)
router.put('/profile',   authUser, uploadImage.single('avatar'), ctrl.updateProfile)
module.exports = router
