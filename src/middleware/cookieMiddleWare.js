const {
  uuidv4,
  makeCsrfToken,
  setSessionCookies,
} = require("../utils/cookies");

function ensureSession(req, res, next) {
  const sid = req.cookies?.sid;
  const csrf = req.cookies?.csrf;

  // Create missing pieces
  if (!sid || !csrf) {
    const sessionId = sid || uuidv4();
    const csrfToken = csrf || makeCsrfToken();

    setSessionCookies(res, { sessionId, csrfToken });

    // also attach to req for use in handlers
    req.sessionId = sessionId;
    req.csrfToken = csrfToken;
  } else {
    req.sessionId = sid;
    req.csrfToken = csrf;
  }

  next();
}

module.exports = { ensureSession };
