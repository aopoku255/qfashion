"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("carts", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("(UUID())"), // For MySQL. If Postgres: Sequelize.literal("gen_random_uuid()")
        primaryKey: true,
        allowNull: false,
      },

      user_id: {
        type: Sequelize.UUID,
        allowNull: true, // allow guest carts
      },
      guest_id: {
        type: Sequelize.UUID,
        allowNull: true, // allow guest carts
      },

      status: {
        type: Sequelize.ENUM("ACTIVE", "CHECKED_OUT", "ABANDONED"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },

      currency: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: "GHS",
      },
      option: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      size: {
        type: Sequelize.STRING(255),
        allowNull: false,
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

    // optional: enforce one ACTIVE cart per user (works only if your DB supports partial unique indexes; MySQL doesn't)
    // We'll enforce in code instead.
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("carts");
    await queryInterface.sequelize
      .query("DROP TYPE IF EXISTS enum_carts_status;")
      .catch(() => {});
  },
};
