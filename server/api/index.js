const { Router } = require('express')
const router = Router()
const userController = require('./users')
const ytsController = require('./yts')

// User routes
router.get('/users', userController.getUsers)
router.get('/yts', ytsController.getMovies)

module.exports = router
