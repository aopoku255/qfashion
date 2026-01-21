const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

function makeCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

function cookieBaseOptions() {
  return {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // use "none" if frontend is on different domain AND you use https
    path: "/",
  };
}

function setSessionCookies(res, { sessionId, csrfToken }) {
  const base = cookieBaseOptions();

  // 1) Session cookie (HttpOnly so JS can't read it)
  res.cookie("sid", sessionId, {
    ...base,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  // 2) CSRF token cookie readable by JS (double-submit pattern)
  // frontend reads this and sends it back via header
  res.cookie("csrf", csrfToken, {
    ...base,
    httpOnly: false,
    maxAge: 1000 * 60 * 60 * 4, // 4 hours
  });

  // Optional: a "csrf_ts" marker (sometimes helpful for debugging/rotation)
  res.cookie("csrf_ts", Date.now().toString(), {
    ...base,
    httpOnly: false,
    maxAge: 1000 * 60 * 60 * 4,
  });
}

function clearSessionCookies(res) {
  const base = cookieBaseOptions();
  res.clearCookie("sid", { ...base });
  res.clearCookie("csrf", { ...base });
  res.clearCookie("csrf_ts", { ...base });
}

module.exports = {
  uuidv4,
  makeCsrfToken,
  setSessionCookies,
  clearSessionCookies,
};
