const router = require("express").Router();
const historyApi = require("connect-history-api-fallback");

router.use("/torrent", require("./routes/torrent"));
router.use("/search", require("./routes/search"));
router.use("/captions", require("./routes/captions"));
router.use("/yts", require("./routes/yts"));
router.use(historyApi());

module.exports = router;
