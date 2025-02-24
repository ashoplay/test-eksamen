const Item = require("../models/Item");

exports.createItem = async (req, res) => {
  const { name, description, owner } = req.body;
  const image = req.file ? req.file.filename : "";

  const newItem = new Item({ name, description, image, owner });
  await newItem.save();
  res.redirect("/home");
};

exports.searchItems = async (req, res) => {
  const query = req.query.q;
  const items = await Item.find({ name: new RegExp(query, "i") });
  res.render("home", { items });
};
