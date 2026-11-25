function validateJsonBody(req, res, next) {
  if (
    ["POST", "PUT"].includes(req.method) &&
    (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
  ) {
    return res.status(400).json({ message: "Please provide a JSON object." });
  }
  next();
}

function errorHandler(error, req, res, next) {
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large." });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON body." });
  }
  console.error(error.message);
  res
    .status(500)
    .json({ message: "Something went wrong. Please try again." });
}

module.exports = { validateJsonBody, errorHandler };
