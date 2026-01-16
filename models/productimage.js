"use strict";

module.exports = (sequelize, DataTypes) => {
  const ProductImage = sequelize.define(
    "ProductImage",
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
      url: { type: DataTypes.STRING(500), allowNull: false },
      alt: { type: DataTypes.STRING(191), allowNull: true },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "sort_order",
      },
    },
    { tableName: "product_images", underscored: true, timestamps: true }
  );

  ProductImage.associate = (models) => {
    ProductImage.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
    });
  };

  return ProductImage;
};
