function csrfProtect(req, res, next) {
  const method = req.method.toUpperCase();
  const unsafe = ["POST", "PUT", "PATCH", "DELETE"];

  if (!unsafe.includes(method)) return next();

  const cookieToken = req.cookies?.csrf;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "CSRF validation failed" });
  }

  next();
}

module.exports = { csrfProtect };
