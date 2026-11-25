const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function createAuthRouter(db, secret, authenticate) {
  const router = express.Router();

  const createSession = (user) => ({
    user,
    token: jwt.sign({ id: user.id }, secret, { expiresIn: "7d" }),
  });

  router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100 ||
      typeof email !== "string" ||
      email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof password !== "string" ||
      password.trim().length < 8 ||
      Buffer.byteLength(password) > 72
    ) {
      return res.status(400).json({
        message:
          "Please enter your name, a valid email, and a password of 8–72 characters.",
      });
    }

    const hash = await bcrypt.hash(password, 10);
    try {
      const result = await db.query(
        "INSERT INTO users(name, email, password_hash) VALUES($1, $2, $3) RETURNING id, name, email",
        [name.trim(), email.trim().toLowerCase(), hash],
      );
      res.status(201).json(createSession(result.rows[0]));
    } catch (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      }
      throw error;
    }
  });

  router.post("/login", async (req, res) => {
    const result = await db.query("SELECT * FROM users WHERE email=$1", [
      String(req.body.email || "")
        .trim()
        .toLowerCase(),
    ]);
    const user = result.rows[0];
    if (
      !user ||
      typeof req.body.password !== "string" ||
      !(await bcrypt.compare(req.body.password, user.password_hash))
    ) {
      return res
        .status(401)
        .json({ message: "Email or password is incorrect." });
    }
    res.json(createSession({ id: user.id, name: user.name, email: user.email }));
  });

  router.get("/me", authenticate, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}

module.exports = { createAuthRouter };
