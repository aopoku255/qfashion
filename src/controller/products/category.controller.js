const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require("../../services/products/category.service");

const router = require("express").Router();

router.post("/create", createCategory);
router.get("/all", getCategories);
router.patch("/update/:id", updateCategory);
router.delete("/delete/:id", deleteCategory);

module.exports = router;
