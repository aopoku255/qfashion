const { Op } = require("sequelize");
const { Category, Product, sequelize } = require("../../../models");

// small helpers
function slugify(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

/**
 * GET /categories
 * Optional query params:
 * - search (matches name or slug)
 * - isActive=true|false
 * - includeCounts=true (adds productsCount)
 */
async function getCategories(req, res) {
  try {
    const { search, isActive, includeCounts } = req.query;

    const where = {};
    const likeOp = Op.iLike ?? Op.like;

    if (search) {
      where[Op.or] = [
        { name: { [likeOp]: `%${search}%` } },
        { slug: { [likeOp]: `%${search}%` } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = String(isActive) === "true";
    }

    const categories = await Category.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    // Optional: attach productsCount
    if (String(includeCounts) === "true") {
      const ids = categories.map((c) => c.id);

      const counts = await Product.findAll({
        attributes: [
          "categoryId",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: { categoryId: ids },
        group: ["categoryId"],
        raw: true,
      });

      const map = new Map(counts.map((r) => [r.categoryId, Number(r.count)]));

      const enriched = categories.map((c) => ({
        ...c.toJSON(),
        productsCount: map.get(c.id) ?? 0,
      }));

      return res.status(200).json({ data: enriched });
    }

    return res.status(200).json({ data: categories });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to fetch categories",
    });
  }
}

/**
 * POST /categories
 * Body: { name, slug?, icon?, isActive? }
 */
async function createCategory(req, res) {
  try {
    const { name, slug, icon, isActive } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const normalizedName = String(name).trim();
    const nextSlug = slug ? slugify(slug) : slugify(normalizedName);

    const existing = await Category.findOne({
      where: {
        [Op.or]: [{ name: normalizedName }, { slug: nextSlug }],
      },
    });

    if (existing) {
      return res.status(409).json({
        message: "Category with same name or slug already exists",
      });
    }

    const category = await Category.create({
      name: normalizedName,
      slug: nextSlug,
      icon: icon ?? null,
      isActive: toBool(isActive, true),
    });

    return res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (err) {
    if (
      err.name === "SequelizeValidationError" ||
      err.name === "SequelizeUniqueConstraintError"
    ) {
      return res.status(400).json({
        message: "Validation error",
        errors: err.errors?.map((e) => ({
          field: e.path,
          message: e.message,
          value: e.value,
        })),
      });
    }

    return res.status(500).json({
      message: err.message || "Create category failed",
    });
  }
}

/**
 * PATCH /categories/:id
 * Body can include: name, slug, icon, isActive
 * - If slug not provided and name changes, slug stays as-is (safe).
 *   If you want it to auto-change, uncomment the marked block.
 */
async function updateCategory(req, res) {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    const patch = {};

    if (req.body.name !== undefined) {
      const nextName = String(req.body.name).trim();
      if (!nextName)
        return res.status(400).json({ message: "name cannot be empty" });
      patch.name = nextName;

      // OPTIONAL auto-slug update when name changes (uncomment if you want)
      // if (req.body.slug === undefined) patch.slug = slugify(nextName);
    }

    if (req.body.slug !== undefined) {
      const nextSlug = slugify(req.body.slug);
      if (!nextSlug)
        return res.status(400).json({ message: "slug cannot be empty" });
      patch.slug = nextSlug;
    }

    if (req.body.icon !== undefined) {
      patch.icon = req.body.icon === "" ? null : req.body.icon;
    }

    if (req.body.isActive !== undefined) {
      patch.isActive = toBool(req.body.isActive, category.isActive);
    }

    // Duplicate check (only if name/slug changing)
    if (patch.name !== undefined || patch.slug !== undefined) {
      const nextName = patch.name ?? category.name;
      const nextSlug = patch.slug ?? category.slug;

      const conflict = await Category.findOne({
        where: {
          id: { [Op.ne]: category.id },
          [Op.or]: [{ name: nextName }, { slug: nextSlug }],
        },
      });

      if (conflict) {
        return res.status(409).json({
          message: "Another category already has this name or slug",
        });
      }
    }

    await category.update(patch);

    return res.status(200).json({
      message: "Category updated successfully",
      category,
    });
  } catch (err) {
    if (
      err.name === "SequelizeValidationError" ||
      err.name === "SequelizeUniqueConstraintError"
    ) {
      return res.status(400).json({
        message: "Validation error",
        errors: err.errors?.map((e) => ({
          field: e.path,
          message: e.message,
          value: e.value,
        })),
      });
    }

    return res.status(500).json({
      message: err.message || "Update category failed",
    });
  }
}

/**
 * DELETE /categories/:id
 * Query:
 * - force=true -> delete even if products exist (will set product.categoryId to fallbackCategoryId if provided)
 * - fallbackCategoryId=<uuid> (required when force=true if you want to reassign products)
 *
 * Default behavior: block deletion if category has products.
 */
async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const force = String(req.query.force) === "true";
    const fallbackCategoryId = req.query.fallbackCategoryId ?? null;

    const category = await Category.findByPk(id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    const productsCount = await Product.count({ where: { categoryId: id } });

    if (productsCount > 0 && !force) {
      return res.status(400).json({
        message:
          "Cannot delete category with products. Use force=true with fallbackCategoryId to reassign.",
        productsCount,
      });
    }

    await sequelize.transaction(async (t) => {
      if (productsCount > 0 && force) {
        if (!fallbackCategoryId) {
          throw new Error("fallbackCategoryId is required when force=true");
        }

        if (fallbackCategoryId === id) {
          throw new Error(
            "fallbackCategoryId cannot be the same as the category being deleted",
          );
        }

        const fallback = await Category.findByPk(fallbackCategoryId, {
          transaction: t,
        });
        if (!fallback) throw new Error("fallbackCategoryId does not exist");

        await Product.update(
          { categoryId: fallbackCategoryId },
          { where: { categoryId: id }, transaction: t },
        );
      }

      await category.destroy({ transaction: t });
    });

    return res.status(200).json({
      message: "Category deleted successfully",
    });
  } catch (err) {
    return res.status(400).json({
      message: err.message || "Delete category failed",
    });
  }
}

module.exports = {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories,
};
