// cart.service.js
const {
  sequelize,
  Cart,
  CartItem,
  Product,
  ProductVariant,
} = require("../../../models");

// helper: safe json parse (same pattern you used)
function parseJsonSafe(value, fallback = null) {
  try {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "object") return value; // already parsed
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// helper: normalize qty
function toPositiveInt(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i > 0 ? i : fallback;
}

/**
 * Add item to cart (user or guest)
 *
 * Expected body (form-data or json):
 * - productId (required)
 * - variantId (optional)
 * - quantity (optional, default 1)
 *
 * For guest:
 * - guestId OR cartToken (required if no logged-in user)
 *   (you can name it "guestId" to keep it simple)
 */
async function addItemsToCart(req, res) {
  try {
    const quantity = toPositiveInt(req.body.quantity, 1);

    // ✅ DO NOT move this to controller
    const userId = req.body.userId ?? null;

    // guest identifier (choose one: guestId or cartToken)
    const guestId = req.body.guestId ?? req.body.cartToken ?? null;
    // const unitPrice = req.body?.unitPrice;

    if (!userId && !guestId) {
      return res.status(400).json({
        message: "guestId (or cartToken) is required for guest cart",
      });
    }

    const productId = req.body.productId;
    const variantId = req.body.variantId ?? null;

    if (!productId) {
      return res.status(400).json({ message: "productId is required" });
    }

    // Optional: validate product / variant existence (recommended)
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (variantId) {
      const variant = await ProductVariant.findOne({
        where: { id: variantId, productId },
      });
      if (!variant) {
        return res
          .status(404)
          .json({ message: "Variant not found for product" });
      }
    }

    const cart = await sequelize.transaction(async (t) => {
      // 1) Find or create cart
      let existingCart = null;

      if (userId) {
        existingCart = await Cart.findOne({
          where: { userId, status: "active" }, // adjust if your Cart model differs
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
      } else {
        existingCart = await Cart.findOne({
          where: { guestId, status: "active" }, // guestId column on Cart
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
      }

      if (!existingCart) {
        existingCart = await Cart.create(
          {
            userId: userId ?? null,
            guestId: userId ? null : guestId,
            status: "active",
            currency: req.body.currency ?? "GHS", // optional if you have this
          },
          { transaction: t },
        );
      }

      // 2) Find existing cart item (same product+variant)
      const whereItem = {
        cartId: existingCart.id,
        productId,
        variantId, // null is fine if no variant
      };

      let item = await CartItem.findOne({
        where: whereItem,
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (item) {
        item.quantity = (item.quantity ?? 0) + quantity;
        await item.save({ transaction: t });
      } else {
        item = await CartItem.create(
          {
            cartId: existingCart.id,
            productId,
            variantId,
            quantity,

            // optional snapshot fields if your CartItem has them:
            unitPrice: product.price,
            currency: existingCart.currency ?? "GHS",
          },
          { transaction: t },
        );
      }

      // (Optional) 3) Recalculate totals if your Cart model stores totals
      // If you have subtotal/total fields, compute here inside the same transaction.

      return existingCart;
    });

    // Return with associations (same as your Product service)
    const full = await Cart.findByPk(cart.id, {
      include: [
        {
          model: CartItem,
          as: "items",
          include: [
            { model: Product, as: "product" },
            { model: ProductVariant, as: "variant" },
          ],
        },
      ],
    });

    return res.status(200).json({ message: "Added to cart", cart: full });
  } catch (err) {
    return res.status(400).json({
      message: err || "Add to cart failed",
    });
  }
}

async function clearCart(req, res) {
  try {
    // DO NOT trust client blindly if you have auth
    const userId = req.body.userId ?? null;
    const guestId = req.body.guestId ?? req.body.cartToken ?? null;

    if (!userId && !guestId) {
      return res.status(400).json({
        message: "userId or guestId (cartToken) is required",
      });
    }

    await sequelize.transaction(async (t) => {
      // 1) Find active cart
      const cart = await Cart.findOne({
        where: userId
          ? { userId, status: "active" }
          : { guestId, status: "active" },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!cart) {
        // No cart = nothing to clear (idempotent)
        return;
      }

      // 2) Delete all items in that cart
      await CartItem.destroy({
        where: { cartId: cart.id },
        transaction: t,
      });

      // Optional: reset totals if you store them
      // await cart.update(
      //   { subtotal: 0, total: 0 },
      //   { transaction: t }
      // );
    });

    return res.status(200).json({
      message: "Cart cleared",
    });
  } catch (err) {
    return res.status(400).json({
      message: err?.message || "Failed to clear cart",
    });
  }
}

async function getCartItems(req, res) {
  try {
    // Prefer auth if available
    const userId = req.body.userId ?? null;
    const guestId = req.body.guestId ?? req.body.cartToken ?? null;

    if (!userId && !guestId) {
      return res.status(400).json({
        message: "userId or guestId (cartToken) is required",
      });
    }

    const cart = await Cart.findOne({
      where: userId
        ? { userId, status: "active" }
        : { guestId, status: "active" },
      include: [
        {
          model: CartItem,
          as: "items",
          include: [
            { model: Product, as: "product" },
            { model: ProductVariant, as: "variant" },
          ],
        },
      ],
      order: [[{ model: CartItem, as: "items" }, "createdAt", "ASC"]],
    });

    // No cart yet → empty cart response
    if (!cart) {
      return res.status(200).json({
        cart: {
          items: [],
          totalItems: 0,
        },
      });
    }

    // Optional computed fields
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    return res.status(200).json({
      cart,
      totalItems,
    });
  } catch (err) {
    return res.status(400).json({
      message: err?.message || "Failed to fetch cart",
    });
  }
}

module.exports = { addItemsToCart, clearCart, getCartItems };
