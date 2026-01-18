const { createAccount, login } = require("../../services/auth/auth.service");

const router = require("express").Router();
router.post("/signup", async (req, res) => await createAccount(req, res));
router.post("/signin", async (req, res) => await login(req, res));

module.exports = router;
