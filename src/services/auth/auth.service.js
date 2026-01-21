const User = require("../../../models").User;
const jwt = require("jsonwebtoken");

async function createAccount(req, res) {
  try {
    const { firstName, lastName, email, password, termsAndConditions } =
      req.body;

    // 1️⃣ Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "firstName, lastName, email and password are required",
      });
    }

    // 2️⃣ Check email uniqueness
    const emailExists = await User.findOne({ where: { email } });

    if (emailExists) {
      return res.status(409).json({
        message: "Email already in use",
      });
    }

    // 3️⃣ Create account
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      status: req.body?.status || "PENDING",
      role: req.body?.role || "CUSTOMER",
      termsAndConditions,
    });

    // 4️⃣ Response (passwordHash excluded by default scope)
    return res.status(201).json({
      message: "Account created successfully",
    });
  } catch (error) {
    console.error("Create account error:", error);

    return res.status(500).json({
      message: "Failed to create account",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    // 1) Validate
    if (!email || !password) {
      return res.status(400).json({
        message: "email and password are required",
      });
    }

    // 2) Find user (include passwordHash via scope)
    const user = await User.scope("withPassword").findOne({
      where: { email },
    });

    // 3) Reject if not found / invalid password (same message for security)
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 4) Block disabled / pending accounts (optional but recommended)
    if (user.status === "disabled") {
      return res.status(403).json({ message: "Account is disabled" });
    }
    if (user.status === "pending") {
      return res.status(403).json({ message: "Please verify your account" });
    }

    // 5) Update last login
    await user.update({ lastLoginAt: new Date() });

    // 6) Create JWT (store secret in env)
    const token = jwt.sign({ id: user.id, role: user.role }, "secret", {
      expiresIn: "7d",
    });

    // 7) Return safe user object (remove secrets)
    const safeUser = await User.findByPk(user.id); // defaultScope excludes passwordHash

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    return res.status(200).json({
      message: "Login successful",
      status: "success",
      token,
      data: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Failed to login" });
  }
}

module.exports = { createAccount, login };
