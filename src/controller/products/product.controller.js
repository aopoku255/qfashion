const { memoryUpload } = require("../../middleware/memoryUpload");
const { makeUploader } = require("../../middleware/upload");
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProduct,
} = require("../../services/products/product.service");

const router = require("express").Router();

const upload = makeUploader({
  folder: "products",
  maxSizeMB: 20,
  allowedMimes: ["image/jpeg", "image/png", "image/webp", "image/jpg"],
});

router.post("/create-product", upload.array("images", 10), createProduct);
router.patch("/products/:id", upload.array("images", 10), updateProduct);
router.delete("/products/:id", deleteProduct);
router.get("/products", getAllProducts);
router.get("/products/:id", getProduct);

module.exports = router;
