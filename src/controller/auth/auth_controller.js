const { createAccount, login } = require("../../services/auth/auth_service");

const router = require("express").Router();
router.get("/signup", async (req, res) => await createAccount(req, res));
router.get("/signin", async (req, res) => await login(req, res));

module.exports = router;
