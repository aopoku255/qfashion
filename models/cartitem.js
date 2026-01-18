"use strict";

module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define(
    "CartItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      cartId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "cart_id",
      },

      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "product_id",
      },

      variantId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "variant_id",
      },

      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1,
        },
      },

      unitPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        field: "unit_price",
      },

      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "GHS",
      },
    },
    {
      tableName: "cart_items",
      underscored: true,
    },
  );

  CartItem.associate = (models) => {
    CartItem.belongsTo(models.Cart, { foreignKey: "cartId", as: "cart" });
    CartItem.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
    });
    CartItem.belongsTo(models.ProductVariant, {
      foreignKey: "variantId",
      as: "variant",
    });
  };

  return CartItem;
};
