const { ensureSession } = require("../middleware/cookieMiddleWare");
const { homeService } = require("../services/home/home.service");

const router = require("express").Router();

router.get("/home", ensureSession, homeService);
module.exports = router;
