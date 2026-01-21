const {
  uuidv4,
  makeCsrfToken,
  setSessionCookies,
} = require("../../utils/cookies");

async function homeService(req, res) {
  // if already exists, keep it
  let sessionId = req.cookies?.sid;
  let csrfToken = req.cookies?.csrf;

  if (!sessionId) sessionId = uuidv4();
  if (!csrfToken) csrfToken = makeCsrfToken();

  setSessionCookies(res, { sessionId, csrfToken });

  return res.status(200).json({
    csrfToken,
  });
}

module.exports = { homeService };
