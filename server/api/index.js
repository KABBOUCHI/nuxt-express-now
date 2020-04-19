const { Router } = require('express')
const router = Router()
const userController = require('./users')

// User routes
router.get('/users', userController.getUsers)
router.use(require('./yts'))

module.exports = router
