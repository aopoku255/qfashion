"use strict";

const { Op } = require("sequelize");

/**
 * Create a URL-friendly slug.
 * Keep it simple; you can swap for "slugify" package if you prefer.
 */
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Ensure slug is unique by appending -2, -3, ...
 */
async function makeUniqueSlug({ Product, baseSlug, transaction }) {
  let slug = baseSlug;
  let n = 2;

  // Find existing slugs like "name" or "name-2" etc.
  // We'll loop until unique.
  while (true) {
    const exists = await Product.findOne({
      where: { slug },
      transaction,
    });
    if (!exists) return slug;
    slug = `${baseSlug}-${n++}`;
  }
}

/**
 * Extract uploaded file URLs from different common upload middlewares.
 * - multer + custom uploader might set { url }
 * - multer-s3 sets { location }
 * - cloudinary might set { path } or { secure_url }
 */
function getFileUrl(file) {
  return (
    file?.url ||
    file?.location ||
    file?.secure_url ||
    file?.path ||
    file?.Url ||
    null
  );
}

/**
 * @param {object} deps
 * @param {object} deps.db - { sequelize, Product, ProductImage, ProductVariant }
 */

async function createProduct({ payload, files, userId }) {
  return sequelize.transaction(async (t) => {
    // 1) Validate minimal requirements
    if (!payload?.name) throw new Error("Product name is required");
    if (!payload?.price && payload?.price !== 0)
      throw new Error("Price is required");

    // 2) Build unique slug
    const baseSlug = slugify(payload.name);
    if (!baseSlug)
      throw new Error("Invalid product name (cannot generate slug)");

    const slug = await makeUniqueSlug({ Product, baseSlug, transaction: t });

    // 3) Create product
    const product = await Product.create(
      {
        name: payload.name,
        slug,

        category: payload.category || "OTHER",
        description: payload.description ?? null,
        brand: payload.brand ?? null,

        price: payload.price,
        compareAtPrice: payload.compareAtPrice ?? null,
        currency: payload.currency || "GHS",

        trackInventory: payload.trackInventory ?? true,
        stock: payload.stock ?? 0,

        isActive: payload.isActive ?? true,
        isFeatured: payload.isFeatured ?? false,

        metaTitle: payload.metaTitle ?? null,
        metaDescription: payload.metaDescription ?? null,

        // if you later add createdBy, vendorId etc:
        // createdBy: userId ?? null,
      },
      { transaction: t }
    );

    // 4) Handle images (thumbnail + gallery)
    // Normalize files shapes
    const thumbnailFile = Array.isArray(files?.thumbnail)
      ? files.thumbnail[0]
      : files?.thumbnail;

    const galleryFiles = Array.isArray(files?.images) ? files.images : [];

    const imageRows = [];

    // Thumbnail as first image with sortOrder -1 (or 0)
    if (thumbnailFile) {
      const url = getFileUrl(thumbnailFile);
      if (!url)
        throw new Error(
          "Thumbnail upload succeeded but URL not found on file object"
        );

      imageRows.push({
        productId: product.id,
        url,
        alt: payload.name,
        sortOrder: 0,
      });
    }

    // Gallery images
    galleryFiles.forEach((file, idx) => {
      const url = getFileUrl(file);
      if (!url) return; // skip broken file objects

      imageRows.push({
        productId: product.id,
        url,
        alt: payload.name,
        sortOrder: thumbnailFile ? idx + 1 : idx,
      });
    });

    if (imageRows.length) {
      await ProductImage.bulkCreate(imageRows, { transaction: t });
    }

    // 5) Variants (optional)
    // If variants exist, it's common to set product.stock as sum of variants stock
    const variants = Array.isArray(payload?.variants) ? payload.variants : [];

    if (variants.length) {
      const variantRows = variants.map((v) => ({
        productId: product.id,
        sku: v.sku ?? null,
        size: v.size ?? null,
        color: v.color ?? null,
        priceOverride: v.priceOverride ?? null,
        stock: v.stock ?? 0,
      }));

      await ProductVariant.bulkCreate(variantRows, { transaction: t });

      // optionally recompute product stock if tracking inventory
      if (product.trackInventory) {
        const total = variantRows.reduce(
          (sum, v) => sum + (Number(v.stock) || 0),
          0
        );
        await product.update({ stock: total }, { transaction: t });
      }
    }

    // 6) Return product with children
    const created = await Product.findByPk(product.id, {
      include: [
        { model: ProductImage, as: "images" },
        { model: ProductVariant, as: "variants" },
      ],
      transaction: t,
    });

    return created;
  });
}

module.exports = { createProduct };
