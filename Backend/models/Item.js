const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  name: String,
  description: String,
  image: String, // Path to uploaded image
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "Eier" },
});

module.exports = mongoose.model("Flokk", ItemSchema);
