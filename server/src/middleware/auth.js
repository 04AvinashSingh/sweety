const jwt = require("jsonwebtoken");

function createAuthMiddleware(db, secret) {
  return async function authenticate(req, res, next) {
    let payload;
    try {
      payload = jwt.verify(
        (req.headers.authorization || "").replace(/^Bearer /, ""),
        secret,
      );
    } catch {
      return res.status(401).json({ message: "Please sign in to continue." });
    }

    const result = await db.query(
      "SELECT id, name, email FROM users WHERE id=$1",
      [payload.id],
    );
    if (!result.rows[0]) {
      return res.status(401).json({ message: "Please sign in to continue." });
    }

    req.user = result.rows[0];
    next();
  };
}

module.exports = { createAuthMiddleware };
