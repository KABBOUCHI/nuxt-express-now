const { Router } = require('express')
const router = Router()
const userController = require('./users')
const ytsController = require('./yts')

// User routes
router.get('/users', userController.getUsers)
router.get('/yts', ytsController.getMovies)
router.use("/torrent", require("./live-torrent-backend/routes/torrent"));

module.exports = router
