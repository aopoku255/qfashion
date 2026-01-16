"use strict";

module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    "Product",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4, // works well across DBs
        primaryKey: true,
      },

      name: { type: DataTypes.STRING(191), allowNull: false },

      slug: {
        type: DataTypes.STRING(220),
        allowNull: false,
        unique: true,
        set(value) {
          this.setDataValue("slug", String(value).toLowerCase().trim());
        },
      },

      category: {
        type: DataTypes.ENUM(
          "DRESSES",
          "TROUSERS",
          "HOODIES",
          "SNEAKERS",
          "BAGS",
          "SLIPPERS",
          "SPRAY",
          "JEWELLERY",
          "OTHER"
        ),
        allowNull: false,
        defaultValue: "OTHER",
      },

      description: { type: DataTypes.TEXT, allowNull: true },
      brand: { type: DataTypes.STRING(120), allowNull: true },

      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: { min: 0 },
      },

      compareAtPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: { min: 0 },
        field: "compare_at_price",
      },

      currency: {
        type: DataTypes.STRING(8),
        allowNull: false,
        defaultValue: "GHS",
      },

      trackInventory: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "track_inventory",
      },

      stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
      },
      isFeatured: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_featured",
      },

      metaTitle: {
        type: DataTypes.STRING(191),
        allowNull: true,
        field: "meta_title",
      },
      metaDescription: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "meta_description",
      },
    },
    {
      tableName: "products",
      underscored: true,
      timestamps: true,
    }
  );

  Product.associate = (models) => {
    Product.hasMany(models.ProductImage, {
      foreignKey: "productId",
      as: "images",
    });
    Product.hasMany(models.ProductVariant, {
      foreignKey: "productId",
      as: "variants",
    });
  };

  return Product;
};
