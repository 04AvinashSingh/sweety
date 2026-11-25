const express = require("express");
const { createReadingController } = require("../controllers/readingController");

function createReadingRouter(db) {
  const router = express.Router();
  const controller = createReadingController(db);

  router.param("id", (req, res, next, id) => {
    if (
      !/^[1-9]\d*$/.test(id) ||
      !Number.isSafeInteger(Number(id)) ||
      Number(id) > 2147483647
    ) {
      return res
        .status(400)
        .json({ message: "Please provide a valid reading ID." });
    }
    next();
  });

  router.get("/", controller.list);
  router.post("/", controller.save);
  router.put("/:id", controller.save);
  router.delete("/:id", controller.remove);

  return router;
}

module.exports = { createReadingRouter };
