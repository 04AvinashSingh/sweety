const express = require("express");
const path = require("node:path");
const fs = require("node:fs");
const cors = require("cors");
const { createAuthMiddleware } = require("./middleware/auth");
const { validateJsonBody, errorHandler } = require("./middleware/errorHandler");
const { createAuthRouter } = require("./routes/authRoutes");
const { createReadingRouter } = require("./routes/readingRoutes");
const { createReportRouter } = require("./routes/reportRoutes");

function createApp(db, secret = process.env.JWT_SECRET) {
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  const app = express();
  const authenticate = createAuthMiddleware(db, secret);

  app.use(
    cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }),
  );
  app.use(express.json({ limit: "16kb" }));
  app.use(validateJsonBody);

  app.get("/api/health", async (req, res) => {
    await db.query("SELECT 1");
    res.json({ status: "ok" });
  });

  app.use("/api/auth", createAuthRouter(db, secret, authenticate));
  app.use("/api/readings", authenticate, createReadingRouter(db));
  app.use("/api/reports", authenticate, createReportRouter(db));

  app.use("/api", (req, res) =>
    res.status(404).json({ message: "Endpoint not found." }),
  );

  const clientBuild = path.resolve(__dirname, "../../client/dist");
  if (fs.existsSync(path.join(clientBuild, "index.html"))) {
    app.use(express.static(clientBuild));
    app.get("/{*path}", (req, res) =>
      res.sendFile(path.join(clientBuild, "index.html")),
    );
  }

  app.use((req, res) =>
    res.status(404).json({ message: "Endpoint not found." }),
  );
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
