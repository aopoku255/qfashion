"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("product_variants", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("(UUID())"),
        primaryKey: true,
        allowNull: false,
      },

      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: "product_id",
        references: { model: "products", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      sku: { type: Sequelize.STRING(80), allowNull: true, unique: true },

      size: { type: Sequelize.STRING(30), allowNull: true }, // e.g. S/M/L/XL or 38/39/40
      color: { type: Sequelize.STRING(50), allowNull: true }, // e.g. Black, White

      priceOverride: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        field: "price_override",
      },

      stock: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: "created_at",
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: "updated_at",
      },
    });

    await queryInterface.addIndex("product_variants", ["product_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("product_variants");
  },
};
