"use strict";

module.exports = (sequelize, DataTypes) => {
  const ProductVariant = sequelize.define(
    "ProductVariant",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "product_id",
      },

      sku: { type: DataTypes.STRING(80), allowNull: true, unique: true },

      size: { type: DataTypes.STRING(30), allowNull: true },
      color: { type: DataTypes.STRING(50), allowNull: true },

      priceOverride: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        field: "price_override",
      },
      stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: "product_variants", underscored: true, timestamps: true }
  );

  ProductVariant.associate = (models) => {
    ProductVariant.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
    });
  };

  return ProductVariant;
};
