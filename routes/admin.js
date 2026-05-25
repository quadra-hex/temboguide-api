const router = require('express').Router()
const ctrl   = require('../controllers/adminController')
const { authAdmin } = require('../middleware/auth')

router.post('/login',                   ctrl.login)
router.get('/stats',                    authAdmin, ctrl.getStats)
router.get('/providers',                authAdmin, ctrl.getProviders)
router.post('/providers/:id/approve',   authAdmin, ctrl.approveProvider)
router.post('/providers/:id/reject',    authAdmin, ctrl.rejectProvider)
router.post('/providers/:id/suspend',   authAdmin, ctrl.suspendProvider)
router.get('/bookings',                 authAdmin, ctrl.getBookings)
router.get('/users',                    authAdmin, ctrl.getUsers)
router.delete('/posts/:id',             authAdmin, ctrl.hidePost)
module.exports = router
