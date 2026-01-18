const { Op } = require("sequelize");
const {
  parseJsonSafe,
  calculateTotalVariantStock,
  toBool,
  toNum,
  tryDeleteLocalFileFromUrl,
} = require("../../../helper/createProducts.helper");
const {
  sequelize,
  Product,
  ProductImage,
  ProductVariant,
} = require("../../../models");
const { buildPublicFileUrl } = require("../../middleware/upload");
const { uploadImageToFirebase } = require("../../utils/firebaseUpload");

async function createProduct(req, res) {
  try {
    // multer files
    const files = Array.isArray(req.files)
      ? req.files
      : req.file
        ? [req.file]
        : [];

    const metaTitle =
      req.body.metaTitle && req.body.metaTitle.trim().length
        ? req.body.metaTitle
        : req.body.name;

    const metaDescription =
      req.body.metaDescription && req.body.metaDescription.trim().length
        ? req.body.metaDescription
        : (req.body.description ?? null);

    // variants might come as JSON string from form-data
    const variants = parseJsonSafe(req.body.variants, []);
    const hasVariants = Array.isArray(variants) && variants.length > 0;

    const totalVariantStock = hasVariants
      ? calculateTotalVariantStock(variants)
      : Number(req.body.stock ?? 0);

    const product = await sequelize.transaction(async (t) => {
      // 1) Create Product
      const created = await Product.create(
        {
          name: req.body.name,
          slug: req.body.slug,
          category: req.body.category,

          description: req.body.description ?? null,
          brand: req.body.brand ?? null,

          price: req.body.price,
          compareAtPrice: req.body.compareAtPrice ?? null,
          currency: req.body.currency ?? "GHS",

          trackInventory:
            req.body.trackInventory === undefined
              ? true
              : String(req.body.trackInventory) === "true",

          stock: totalVariantStock,

          isActive:
            req.body.isActive === undefined
              ? true
              : String(req.body.isActive) === "true",
          isFeatured:
            req.body.isFeatured === undefined
              ? false
              : String(req.body.isFeatured) === "true",

          metaTitle,
          metaDescription,
        },
        { transaction: t },
      );

      // 2) Save Product Images
      if (files.length) {
        const imagesPayload = files.map((file, index) => ({
          productId: created.id,
          url: buildPublicFileUrl(req, file, "products"),
          alt: req.body.alt ?? created.name ?? null,
          sortOrder: index,
        }));

        await ProductImage.bulkCreate(imagesPayload, { transaction: t });
      }

      // 2) Save Product Images (Firebase)
      // if (files.length) {
      //   const uploads = await Promise.all(
      //     files.map((file) =>
      //       uploadImageToFirebase({ file, folder: "products" }),
      //     ),
      //   );

      //   const imagesPayload = uploads.map((u, index) => ({
      //     productId: created.id,
      //     url: u.url,
      //     storagePath: u.storagePath, // ✅ store this!
      //     alt: req.body.alt ?? created.name ?? null,
      //     sortOrder: index,
      //   }));

      //   await ProductImage.bulkCreate(imagesPayload, { transaction: t });
      // }

      // 3) Save Variants
      if (Array.isArray(variants) && variants.length) {
        const variantsPayload = variants.map((v) => ({
          productId: created.id,
          sku: v.sku ?? null,
          size: v.size ?? null,
          color: v.color ?? null,
          priceOverride: v.priceOverride ?? null,
          stock: v.stock ?? 0,
        }));

        await ProductVariant.bulkCreate(variantsPayload, { transaction: t });
      }

      return created;
    });

    // Return with associations
    const full = await Product.findByPk(product.id, {
      include: [
        { model: ProductImage, as: "images" },
        { model: ProductVariant, as: "variants" },
      ],
    });

    return res.status(201).json({ message: "Product created", product: full });
  } catch (err) {
    return res.status(400).json({
      message: err || "Create product failed",
    });
  }
}

async function updateProduct(req, res) {
  try {
    const productId = req.params.id;

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // multer files (optional)
    const files = Array.isArray(req.files)
      ? req.files
      : req.file
        ? [req.file]
        : [];

    // options
    const replaceImages = toBool(req.body.replaceImages, false);
    const deleteMissingVariants = toBool(req.body.deleteMissingVariants, false);

    // variants can be omitted (meaning: don't touch variants)
    // if provided, can be JSON string (multipart)
    const variantsInput =
      req.body.variants === undefined
        ? undefined
        : parseJsonSafe(req.body.variants, []);

    const updated = await sequelize.transaction(async (t) => {
      // 1) Build partial patch
      const patch = {};

      if (req.body.name !== undefined) patch.name = req.body.name;
      if (req.body.slug !== undefined) patch.slug = req.body.slug;
      if (req.body.category !== undefined) patch.category = req.body.category;

      if (req.body.description !== undefined)
        patch.description = req.body.description ?? null;

      if (req.body.brand !== undefined) patch.brand = req.body.brand ?? null;

      if (req.body.price !== undefined)
        patch.price = toNum(req.body.price, product.price);

      if (req.body.compareAtPrice !== undefined)
        patch.compareAtPrice =
          req.body.compareAtPrice === ""
            ? null
            : toNum(req.body.compareAtPrice, product.compareAtPrice);

      if (req.body.currency !== undefined) patch.currency = req.body.currency;

      if (req.body.trackInventory !== undefined)
        patch.trackInventory = toBool(
          req.body.trackInventory,
          product.trackInventory,
        );

      if (req.body.isActive !== undefined)
        patch.isActive = toBool(req.body.isActive, product.isActive);

      if (req.body.isFeatured !== undefined)
        patch.isFeatured = toBool(req.body.isFeatured, product.isFeatured);

      // meta fallback (same idea as create):
      // - if user sends metaTitle/metaDescription -> use it
      // - else if they changed name/description -> fallback to new name/description
      // - else keep existing
      const nextName = patch.name ?? product.name;
      const nextDesc = patch.description ?? product.description ?? null;

      if (req.body.metaTitle !== undefined) {
        patch.metaTitle = req.body.metaTitle?.trim()?.length
          ? req.body.metaTitle
          : nextName;
      } else if (patch.name !== undefined && !product.metaTitle) {
        patch.metaTitle = nextName;
      }

      if (req.body.metaDescription !== undefined) {
        patch.metaDescription = req.body.metaDescription?.trim()?.length
          ? req.body.metaDescription
          : nextDesc;
      } else if (patch.description !== undefined && !product.metaDescription) {
        patch.metaDescription = nextDesc;
      }

      await product.update(patch, { transaction: t });

      // 2) Images (optional)
      if (replaceImages && files.length) {
        await ProductImage.destroy({ where: { productId }, transaction: t });
      }

      if (files.length) {
        let startOrder = 0;

        if (!replaceImages) {
          const maxSort = await ProductImage.max("sortOrder", {
            where: { productId },
            transaction: t,
          });
          startOrder = Number.isFinite(maxSort) ? maxSort + 1 : 0;
        }

        const imagesPayload = files.map((file, index) => ({
          productId,
          url: buildPublicFileUrl(req, file, "products"),
          alt: req.body.alt ?? product.name ?? null,
          sortOrder: startOrder + index,
        }));

        await ProductImage.bulkCreate(imagesPayload, { transaction: t });
      }

      // 3) Variants (optional)
      // If variants is not provided -> don't touch variants or stock-from-variants logic
      if (variantsInput !== undefined) {
        if (!Array.isArray(variantsInput)) {
          throw new Error("variants must be an array");
        }

        const keepIds = [];

        for (const v of variantsInput) {
          const payload = {
            productId,
            sku: v.sku ?? null,
            size: v.size ?? null,
            color: v.color ?? null,
            priceOverride: v.priceOverride ?? null,
            stock: v.stock ?? 0,
          };

          if (v.id) {
            // update by id (best)
            const existing = await ProductVariant.findOne({
              where: { id: v.id, productId },
              transaction: t,
            });
            if (!existing) throw new Error(`Variant not found: ${v.id}`);
            await existing.update(payload, { transaction: t });
            keepIds.push(existing.id);
          } else if (v.sku) {
            // fallback: update by sku
            const existing = await ProductVariant.findOne({
              where: { sku: v.sku, productId },
              transaction: t,
            });

            if (existing) {
              await existing.update(payload, { transaction: t });
              keepIds.push(existing.id);
            } else {
              const createdVar = await ProductVariant.create(payload, {
                transaction: t,
              });
              keepIds.push(createdVar.id);
            }
          }
        }

        if (deleteMissingVariants) {
          await ProductVariant.destroy({
            where: {
              productId,
              id: { [Op.notIn]: keepIds },
            },
            transaction: t,
          });
        }

        // ✅ stock = total variant stock (same as create)
        const finalVariants = await ProductVariant.findAll({
          where: { productId },
          attributes: ["stock"],
          transaction: t,
        });

        const totalStock = calculateTotalVariantStock(
          finalVariants.map((x) => ({ stock: x.stock })),
        );

        await product.update({ stock: totalStock }, { transaction: t });
      } else {
        // If no variants change, allow manual stock update ONLY if you want:
        // (optional - you can remove this block if you never want manual stock)
        if (req.body.stock !== undefined) {
          await product.update(
            { stock: toNum(req.body.stock, product.stock) },
            { transaction: t },
          );
        }
      }

      return product;
    });

    const full = await Product.findByPk(updated.id, {
      include: [
        { model: ProductImage, as: "images" },
        { model: ProductVariant, as: "variants" },
      ],
    });

    return res.status(200).json({ message: "Product updated", product: full });
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

    return res.status(400).json({
      message: err.message || "Update product failed",
    });
  }
}

async function deleteProduct(req, res) {
  try {
    const productId = req.params.id;

    const product = await Product.findByPk(productId, {
      include: [{ model: ProductImage, as: "images" }],
    });

    if (!product) return res.status(404).json({ message: "Product not found" });

    const deleteFiles = req.query.deleteFiles === "true";

    // 1) Delete DB rows first (transaction)
    await sequelize.transaction(async (t) => {
      await ProductVariant.destroy({ where: { productId }, transaction: t });
      await ProductImage.destroy({ where: { productId }, transaction: t });
      await Product.destroy({ where: { id: productId }, transaction: t });
    });

    // 2) Then delete files from disk
    const fileResults = [];
    if (deleteFiles && product.images?.length) {
      for (const img of product.images) {
        const result = tryDeleteLocalFileFromUrl(img.url);
        fileResults.push({ url: img.url, ...result });
      }
    }

    return res.status(200).json({
      message: "Product deleted successfully",
      deletedFiles: deleteFiles ? fileResults : undefined,
    });
  } catch (err) {
    return res.status(400).json({
      message: err.message || "Delete product failed",
    });
  }
}

async function getAllProducts(req, res) {
  try {
    // query params
    const {
      page = 1,
      limit = 10,
      search,
      category,
      isActive,
      isFeatured,
    } = req.query;

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.min(Math.max(Number(limit), 1), 100);
    const offset = (pageNum - 1) * limitNum;

    // where clause (built dynamically)
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { brand: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = String(isActive) === "true";
    }

    if (isFeatured !== undefined) {
      where.isFeatured = String(isFeatured) === "true";
    }

    const { rows, count } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: ProductImage,
          as: "images",
          separate: true,
          order: [["sortOrder", "ASC"]],
        },
        {
          model: ProductVariant,
          as: "variants",
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset,
      distinct: true, // important when using include
    });

    return res.status(200).json({
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to fetch products",
    });
  }
}

async function getProduct(req, res) {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        {
          model: ProductImage,
          as: "images",
          separate: true,
          order: [["sortOrder", "ASC"]],
        },
        {
          model: ProductVariant,
          as: "variants",
        },
      ],
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      product,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to fetch product",
    });
  }
}

// async function deleteProduct(req, res) {
//   try {
//     const productId = req.params.id;

//     const product = await Product.findByPk(productId, {
//       include: [{ model: ProductImage, as: "images" }],
//     });

//     if (!product) return res.status(404).json({ message: "Product not found" });

//     // Keep a copy BEFORE deleting DB rows
//     const images =
//       product.images?.map((img) => ({
//         url: img.url,
//         storagePath: img.storagePath, // only works if you added this column
//       })) || [];

//     // 1) Delete DB rows first (transaction)
//     await sequelize.transaction(async (t) => {
//       await ProductVariant.destroy({ where: { productId }, transaction: t });
//       await ProductImage.destroy({ where: { productId }, transaction: t });
//       await Product.destroy({ where: { id: productId }, transaction: t });
//     });

//     // 2) Delete Firebase objects after DB success
//     const deletedFirebaseFiles = await Promise.all(
//       images.map((img) => deleteFromFirebase(img)),
//     );

//     return res.status(200).json({
//       message: "Product deleted successfully",
//       deletedFirebaseFiles,
//     });
//   } catch (err) {
//     return res.status(400).json({
//       message: err.message || "Delete product failed",
//     });
//   }
// }

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProduct,
};
