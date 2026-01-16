"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("product_images", {
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

      url: { type: Sequelize.STRING(500), allowNull: false },
      alt: { type: Sequelize.STRING(191), allowNull: true },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "sort_order",
      },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("product_images", ["product_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("product_images");
  },
};
