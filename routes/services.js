const router = require('express').Router()
const ctrl   = require('../controllers/serviceController')
const { authProvider } = require('../middleware/auth')
const { uploadImage }  = require('../config/cloudinary')

router.get('/',       ctrl.getAllServices)                  // ✅ NO AUTH NEEDED
router.get('/my',     authProvider, ctrl.getMyServices)    // Providers see their own
router.post('/',      authProvider, uploadImage.array('images', 5), ctrl.createService)
router.put('/:id',    authProvider, uploadImage.array('images', 5), ctrl.updateService)
router.delete('/:id', authProvider, ctrl.deleteService)

module.exports = router