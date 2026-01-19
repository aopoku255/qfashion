"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    /* ================================
       1️⃣ ADD category_id
    ================================= */
    await queryInterface.addColumn("products", "category_id", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "categories",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    /* ================================
       2️⃣ REMOVE old ENUM category
       (only if it exists)
    ================================= */
    await queryInterface.removeColumn("products", "category");

    /* ================================
       3️⃣ RATINGS
    ================================= */
    await queryInterface.addColumn("products", "rating_average", {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("products", "rating_count", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    /* ================================
       4️⃣ DISCOUNTS
    ================================= */
    await queryInterface.addColumn("products", "discount_type", {
      type: Sequelize.ENUM("NONE", "PERCENT", "AMOUNT"),
      allowNull: false,
      defaultValue: "NONE",
    });

    await queryInterface.addColumn("products", "discount_value", {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("products", "discounted_price", {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
    });

    /* ================================
       5️⃣ META KEYWORDS
    ================================= */
    await queryInterface.addColumn("products", "meta_keywords", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    /* ================================
       ROLLBACK
    ================================= */

    await queryInterface.removeColumn("products", "meta_keywords");
    await queryInterface.removeColumn("products", "discounted_price");
    await queryInterface.removeColumn("products", "discount_value");
    await queryInterface.removeColumn("products", "discount_type");
    await queryInterface.removeColumn("products", "rating_count");
    await queryInterface.removeColumn("products", "rating_average");
    await queryInterface.removeColumn("products", "category_id");

    // Restore ENUM category (rollback safety)
    await queryInterface.addColumn("products", "category", {
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
    });
  },
};
