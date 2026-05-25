const router = require('express').Router()
const ctrl   = require('../controllers/providerAuthController')
const { authProviderAny, authProvider } = require('../middleware/auth')
const { uploadPayment, uploadImage } = require('../config/cloudinary')

router.post('/register',       ctrl.register)
router.post('/login',          ctrl.login)
// router.post('/upload-payment', authProviderAny, uploadPayment.single('proof'), ctrl.uploadPaymentProof)
router.get('/dashboard',       authProviderAny, ctrl.getDashboard)
router.put('/profile',         authProvider, uploadImage.single('logo'), ctrl.updateProfile)
module.exports = router
