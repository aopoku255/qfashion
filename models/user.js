"use strict";
const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      // identity
      email: {
        type: DataTypes.STRING(191),
        allowNull: false,
        unique: true,
        set(value) {
          this.setDataValue("email", value.toLowerCase().trim());
        },
        validate: {
          notEmpty: { msg: "Email is required" },
          isEmail: { msg: "Email must be valid" },
        },
      },

      phone: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },

      username: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
          len: {
            args: [3, 50],
            msg: "Username must be between 3 and 50 characters",
          },
        },
      },

      // auth
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "password_hash",
      },

      role: {
        type: DataTypes.ENUM("customer", "admin", "staff"),
        allowNull: false,
        defaultValue: "customer",
      },

      status: {
        type: DataTypes.ENUM("active", "disabled", "pending"),
        allowNull: false,
        defaultValue: "pending",
      },

      termsAndConditions: {
        type: DataTypes.BOOLEAN,
        field: "terms_and_conditions",
        allowNull: false,
        defaultValue: false,
      },

      // verification + recovery
      emailVerifiedAt: {
        type: DataTypes.DATE,
        field: "email_verified_at",
      },

      phoneVerifiedAt: {
        type: DataTypes.DATE,
        field: "phone_verified_at",
      },

      resetTokenHash: {
        type: DataTypes.STRING(255),
        field: "reset_token_hash",
      },

      resetTokenExpiresAt: {
        type: DataTypes.DATE,
        field: "reset_token_expires_at",
      },

      // security / sessions
      lastLoginAt: {
        type: DataTypes.DATE,
        field: "last_login_at",
      },

      failedLoginAttempts: {
        type: DataTypes.INTEGER.UNSIGNED,
        defaultValue: 0,
        field: "failed_login_attempts",
      },

      lockedUntil: {
        type: DataTypes.DATE,
        field: "locked_until",
      },

      // profile
      firstName: {
        type: DataTypes.STRING(80),
        allowNull: false,
        field: "first_name",
        validate: {
          notEmpty: { msg: "First name is required" },
          len: {
            args: [2, 80],
            msg: "First name must be at least 2 characters",
          },
        },
      },

      lastName: {
        type: DataTypes.STRING(80),
        allowNull: false,
        field: "last_name",
        validate: {
          notEmpty: { msg: "Last name is required" },
          len: {
            args: [2, 80],
            msg: "Last name must be at least 2 characters",
          },
        },
      },
      avatarUrl: {
        type: DataTypes.STRING(500),
        field: "avatar_url",
      },

      dateOfBirth: {
        type: DataTypes.DATEONLY,
        field: "date_of_birth",
      },

      deletedAt: {
        type: DataTypes.DATE,
        field: "deleted_at",
      },

      /**
       * ✅ Virtual field (THIS is what you accept from API)
       */
      password: {
        type: DataTypes.VIRTUAL,

        validate: {
          requiredOnCreate() {
            // Require password only when creating
            if (this.isNewRecord && !this.getDataValue("password")) {
              throw new Error("Password is required");
            }
          },

          len(value) {
            if (!value) return; // let requiredOnCreate handle empties
            if (value.length < 8 || value.length > 128) {
              throw new Error("Password must be at least 8 characters");
            }
          },

          isStrong(value) {
            if (!value) return;

            const strong =
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

            if (!strong.test(value)) {
              throw new Error(
                "Password must include uppercase, lowercase, number and symbol",
              );
            }
          },
        },

        set(value) {
          // store raw password in virtual field (so validators can read it)
          this.setDataValue("password", value);

          // put raw into passwordHash; hook will hash it before save
          this.setDataValue("passwordHash", value);
        },
      },
    },
    {
      tableName: "users",
      underscored: true,
      timestamps: true,
      paranoid: true,

      /**
       * 🔐 Password hashing lives HERE
       */
      hooks: {
        beforeValidate: (user) => {
          // Auto-generate username from email if not provided
          if (!user.username && user.email) {
            const baseUsername = user.email.split("@")[0].toLowerCase();
            user.username = baseUsername;
          }
        },
        beforeCreate: async (user) => {
          if (user.passwordHash) {
            user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed("passwordHash")) {
            user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
          }
        },
      },

      /**
       * 🚫 Never expose password hashes
       */
      defaultScope: {
        attributes: { exclude: ["passwordHash"] },
      },

      scopes: {
        withPassword: {
          attributes: { include: ["passwordHash"] },
        },
      },
    },
  );

  /**
   * 🔍 Login helper
   */
  User.prototype.verifyPassword = function (password) {
    return bcrypt.compare(password, this.passwordHash);
  };

  return User;
};
