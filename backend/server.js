// backend/server.js
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let leaderboard = []; // Temporary (in-memory) data

app.get("/leaderboard", (req, res) => {
  res.json(leaderboard);
});

app.post("/submit", (req, res) => {
  const { name, score } = req.body;
  leaderboard.push({ name, score });
  leaderboard.sort((a, b) => b.score - a.score);
  res.json({ message: "Score submitted!", leaderboard });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
