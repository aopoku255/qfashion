"use strict";

module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define(
    "Cart",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4, // works at app-level
        primaryKey: true,
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "user_id",
      },
      guestId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "guest_id",
      },

      status: {
        type: DataTypes.ENUM("ACTIVE", "CHECKED_OUT", "ABANDONED"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },

      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "GHS",
      },
    },
    {
      tableName: "carts",
      underscored: true,
    },
  );

  Cart.associate = (models) => {
    Cart.hasMany(models.CartItem, { foreignKey: "cartId", as: "items" });

    // If you have a User model:
    // Cart.belongsTo(models.User, { foreignKey: "userId", as: "user" });
  };

  return Cart;
};
