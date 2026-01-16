const {
  makeProductService,
} = require("../../services/products/product_service");

const router = require("express").Router();
router.get(
  "/create-product",
  async (req, res) => await makeProductService(req, res)
);

module.exports = router;
