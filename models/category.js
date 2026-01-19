"use strict";

module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define(
    "Category",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        set(value) {
          this.setDataValue("name", value.trim());
        },
      },

      slug: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
        set(value) {
          this.setDataValue("slug", value.toLowerCase().trim());
        },
      },

      // Can be: icon URL, file path, or icon key (e.g. "mdi:tshirt-crew")
      icon: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
      },
    },
    {
      tableName: "categories",
      underscored: true,
      timestamps: true,
    },
  );

  Category.associate = (models) => {
    Category.hasMany(models.Product, {
      foreignKey: "categoryId",
      as: "products",
    });
  };

  return Category;
};
