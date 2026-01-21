const { ensureSession } = require("../../middleware/cookieMiddleWare");
const { csrfProtect } = require("../../middleware/verifyCSRF");
const {
  addItemsToCart,
  clearCart,
  getCartItems,
} = require("../../services/cart/cart.service");

const router = require("express").Router();

router.post("/add", ensureSession, csrfProtect, addItemsToCart);
router.post("/clear", ensureSession, csrfProtect, clearCart);
router.post("/", ensureSession, csrfProtect, getCartItems);

module.exports = router;
