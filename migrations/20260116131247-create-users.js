// migrations/XXXXXXXXXXXX-create-users.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },

      // identity
      email: {
        type: Sequelize.STRING(191),
        allowNull: false,
        unique: "uq_users_email",
      },
      phone: {
        type: Sequelize.STRING(32),
        allowNull: true,
        unique: "uq_users_phone",
      },
      username: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: "uq_users_username",
      },

      // auth
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM("customer", "admin", "staff"),
        allowNull: false,
        defaultValue: "customer",
      },
      status: {
        type: Sequelize.ENUM("active", "disabled", "pending"),
        allowNull: false,
        defaultValue: "pending",
      },
      terms_and_conditions: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      // verification + recovery
      email_verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      phone_verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reset_token_hash: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      reset_token_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      // security / sessions
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      failed_login_attempts: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      locked_until: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      // profile
      first_name: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      last_name: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      avatar_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      date_of_birth: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      // audit
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // updated_at ON UPDATE CURRENT_TIMESTAMP (MySQL-specific)
    await queryInterface.sequelize.query(`
      ALTER TABLE users
      MODIFY updated_at DATETIME NOT NULL
      DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP;
    `);

    // indexes (like your SQL)
    await queryInterface.addIndex("users", ["role"], {
      name: "idx_users_role",
    });
    await queryInterface.addIndex("users", ["status"], {
      name: "idx_users_status",
    });
    await queryInterface.addIndex("users", ["deleted_at"], {
      name: "idx_users_deleted_at",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("users");

    // clean up enums (important for some setups)
    // MySQL usually drops with table, but Sequelize sometimes needs this in other DBs.
  },
};
