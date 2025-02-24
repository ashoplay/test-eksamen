const express = require("express");
const { createItem, searchItems } = require("../controllers/itemController");
const router = express.Router();
const upload = require("../middleware/upload");

router.post("/create", upload.single("image"), createItem);
router.get("/search", searchItems);

module.exports = router;
