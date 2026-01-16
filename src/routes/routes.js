const router = require("express").Router();
const auth_controller = require("../controller/auth/auth_controller");
const product_controller = require("../controller/products/product_controller");

router.use("/auth", auth_controller);
router.use("/products", product_controller);

module.exports = router;
