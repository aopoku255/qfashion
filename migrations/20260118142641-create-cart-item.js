"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("cart_items", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("(UUID())"),
        primaryKey: true,
        allowNull: false,
      },

      cart_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },

      product_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },

      variant_id: {
        type: Sequelize.UUID,
        allowNull: true, // allow product without variants
      },

      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      unit_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },

      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: "GHS",
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    // FK constraints (recommended)
    await queryInterface.addConstraint("cart_items", {
      fields: ["cart_id"],
      type: "foreign key",
      name: "fk_cart_items_cart_id",
      references: { table: "carts", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.addConstraint("cart_items", {
      fields: ["product_id"],
      type: "foreign key",
      name: "fk_cart_items_product_id",
      references: { table: "products", field: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    await queryInterface.addConstraint("cart_items", {
      fields: ["variant_id"],
      type: "foreign key",
      name: "fk_cart_items_variant_id",
      references: { table: "product_variants", field: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    // Helpful index for fetching cart items
    await queryInterface.addIndex("cart_items", ["cart_id"], {
      name: "idx_cart_items_cart_id",
    });

    // Prevent duplicates: one line per (cart + product + variant)
    await queryInterface.addIndex(
      "cart_items",
      ["cart_id", "product_id", "variant_id"],
      {
        unique: true,
        name: "uniq_cart_product_variant",
      },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("cart_items");
  },
};
