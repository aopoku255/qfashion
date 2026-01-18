"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("products", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("(UUID())"), // MySQL. For Postgres use Sequelize.UUIDV4 in model
        primaryKey: true,
        allowNull: false,
      },

      name: { type: Sequelize.STRING(191), allowNull: false },
      slug: { type: Sequelize.STRING(220), allowNull: false, unique: true },

      category: {
        type: Sequelize.ENUM(
          "DRESSES",
          "TROUSERS",
          "HOODIES",
          "SNEAKERS",
          "BAGS",
          "SLIPPERS",
          "SPRAY",
          "JEWELLERY",
          "OTHER",
        ),
        allowNull: false,
        defaultValue: "OTHER",
      },

      description: { type: Sequelize.TEXT, allowNull: true },

      brand: { type: Sequelize.STRING(120), allowNull: true },

      // pricing
      price: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      compareAtPrice: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        field: "compare_at_price",
      },
      currency: {
        type: Sequelize.STRING(8),
        allowNull: false,
        defaultValue: "GHS",
      },

      // inventory
      trackInventory: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "track_inventory",
      },

      // if you don't want variants, you can store stock here too
      stock: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },

      // metadata / status
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_featured",
      },

      // SEO
      metaTitle: {
        type: Sequelize.STRING(191),
        allowNull: true,
        field: "meta_title",
      },
      metaDescription: {
        type: Sequelize.STRING(255),
        allowNull: true,
        field: "meta_description",
      },

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

    await queryInterface.addIndex("products", ["category"]);
    await queryInterface.addIndex("products", ["is_active"]);
    await queryInterface.addIndex("products", ["is_featured"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("products");
  },
};
