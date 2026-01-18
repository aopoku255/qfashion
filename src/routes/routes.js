const router = require("express").Router();
const auth_controller = require("../controller/auth/auth.controller");
const product_controller = require("../controller/products/product.controller");
const cart_controller = require("../controller/cart/cart.controller");

router.use("/auth", auth_controller);
router.use("/products", product_controller);
router.use("/cart", cart_controller);

module.exports = router;
