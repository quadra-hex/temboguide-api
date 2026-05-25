const express = require('express')
const router  = express.Router()

router.use('/auth',      require('./auth'))
router.use('/provider',  require('./provider'))
router.use('/admin',     require('./admin'))
router.use('/bookings',  require('./bookings'))
router.use('/services',  require('./services'))
router.use('/community', require('./community'))
router.use('/chat',      require('./chat'))

module.exports = router
