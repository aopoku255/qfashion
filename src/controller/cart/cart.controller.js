const {
  addItemsToCart,
  clearCart,
  getCartItems,
} = require("../../services/cart/cart.service");

const router = require("express").Router();

router.post("/item", addItemsToCart);
router.post("/clear", clearCart);
router.post("/", getCartItems);

module.exports = router;
