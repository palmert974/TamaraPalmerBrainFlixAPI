"use strict";

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Helpers to load data (note: serverless fs is ephemeral; writes won't persist)
const DATA_DIR = path.join(__dirname, "data");
const VIDEOS_LIST_PATH = path.join(DATA_DIR, "videos.json");
const VIDEOS_DETAILS_PATH = path.join(DATA_DIR, "video-details.json");

// In-memory store seeded on cold start for demo purposes
let videosList = null; // array of summaries
let videosDetails = null; // array of full objects
function seedMemory() {
  if (!videosList) videosList = readJson(VIDEOS_LIST_PATH) || [];
  if (!videosDetails) videosDetails = readJson(VIDEOS_DETAILS_PATH) || [];
}
seedMemory();

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err);
    return null;
  }
}

// Health check
app.get(["/", "/api", "/api/health"], (_req, res) => {
  res.json({ ok: true, service: "brainflix-api", timestamp: Date.now() });
});

// List videos (summary)
app.get("/api/videos", (_req, res) => {
  seedMemory();
  res.json(videosList);
});

// Create a new video (demo-only, in-memory)
app.post("/api/videos", (req, res) => {
  seedMemory();
  const { title, description } = req.body || {};
  if (!title || !description) {
    return res.status(400).json({ error: "title and description are required" });
  }
  const id = require("uuid").v4();
  const timestamp = Date.now();
  const newSummary = { id, title, channel: "You", image: "/public/images/Upload-video-preview.jpg" };
  const newDetails = {
    id,
    title,
    channel: "You",
    description,
    views: "0",
    likes: "0",
    duration: "4:20",
    video: "",
    timestamp,
    comments: []
  };
  videosList.unshift(newSummary);
  videosDetails.unshift(newDetails);
  return res.status(201).json(newDetails);
});

// Video details by id
app.get("/api/videos/:id", (req, res) => {
  seedMemory();
  const { id } = req.params;
  const video = videosDetails.find((v) => String(v.id) === String(id));
  if (!video) return res.status(404).json({ error: "Video not found" });
  res.json(video);
});

// Add a comment to a video (demo-only, in-memory)
app.post("/api/videos/:id/comments", (req, res) => {
  seedMemory();
  const { id } = req.params;
  const { name = "You", comment } = req.body || {};
  if (!comment) return res.status(400).json({ error: "comment is required" });
  const video = videosDetails.find((v) => String(v.id) === String(id));
  if (!video) return res.status(404).json({ error: "Video not found" });
  const newComment = { id: require("uuid").v4(), name, comment, likes: 0, timestamp: Date.now() };
  video.comments.unshift(newComment);
  return res.status(201).json(newComment);
});

// Static assets (images) if needed
app.use("/public", express.static(path.join(__dirname, "public")));

// Export for Vercel (@vercel/node)
module.exports = app;

// Also start locally if run via `node index.js`
if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`BrainFlix API listening on http://localhost:${PORT}`));
}