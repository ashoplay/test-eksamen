require("dotenv").config();
const express = require("express");
const mongoose = require("./config/db");
const authRoutes = require("./routes/auth");
const itemRoutes = require("./routes/items");

const app = express();
app.set("views", path.join(__dirname, "frontend", "views"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("frontend/public"));


app.use("/auth", authRoutes);
app.use("/items", itemRoutes);

// In backend server.js
const path = require("path");

app.get("/", (req, res) => {
  // If you want to render the homepage from EJS
  res.render("home", { items: [] });  // Render home.ejs
});

// OR, if the frontend is a separate app (like React):
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "public", "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
