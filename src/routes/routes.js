const router = require("express").Router();
const auth_controller = require("../controller/auth/auth.controller");
const product_controller = require("../controller/products/product.controller");
const cart_controller = require("../controller/cart/cart.controller");
const category_controller = require("../controller/products/category.controller");

router.use("/auth", auth_controller);
router.use("/products", product_controller);
router.use("/cart", cart_controller);
router.use("/category", category_controller);

module.exports = router;
