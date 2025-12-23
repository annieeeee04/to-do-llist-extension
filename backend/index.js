// backend/index.js

require("dotenv").config();
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
console.log("OPENAI_API_KEY present?", !!process.env.OPENAI_API_KEY);


const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = 4000;

// middleware
app.use(cors()); // allow requests from React + extension
app.use(express.json()); // parse JSON bodies

// MySQL connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Annie12345!",
  database: "mood_journal",
  waitForConnections: true,
  connectionLimit: 10,
});

// helper
function nowUtc() {
  return new Date();
}

// ---------- ROUTES ----------

// GET /api/tasks  -> list all tasks (you can later add filters)
app.get("/api/tasks", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, text, done, created_at, source FROM tasks ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/tasks error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/tasks  -> create a new task
app.post("/api/tasks", async (req, res) => {
  try {
    const { text, done = false, createdAt, source = "web" } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text is required" });
    }

    const created = createdAt ? new Date(createdAt) : nowUtc();

    const [result] = await pool.query(
      "INSERT INTO tasks (text, done, created_at, source) VALUES (?, ?, ?, ?)",
      [text, done ? 1 : 0, created, source]
    );

    const [rows] = await pool.query(
      "SELECT id, text, done, created_at, source FROM tasks WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/tasks error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- AI chat endpoint using OpenAI ----------
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    // Convert front-end messages to OpenAI-style messages
    const chatMessages = [
      {
        role: "system",
        content:
          "You are a gentle, supportive companion in a mood journaling app. " +
          "You listen, validate feelings, and offer small, realistic suggestions. " +
          "You are NOT a therapist and must remind users you cannot give medical advice.",
      },
    ];

    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (!m.content && !m.text) continue;
        chatMessages.push({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content || m.text,
        });
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "I'm here with you. Sometimes it's hard to find the right words, but I'm listening.";

    res.json({ reply });
  } catch (err) {
    console.error("POST /api/chat error:", err.response?.data || err.message);
    res.status(500).json({
      error: "chat server error",
      reply:
        "Sorry, I had trouble connecting to my brain just now. Please try again in a moment.",
    });
  }
});


// ---------- Save / update today's journal ----------
app.post("/api/journal", async (req, res) => {
    try {
      const { dateKey, mood, note } = req.body;
  
      if (!dateKey) {
        return res.status(400).json({ error: "dateKey is required" });
      }
  
      // Insert or update the journal entry for that date
      await pool.query(
        `
        INSERT INTO journal_entries (date_key, mood, note)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          mood = VALUES(mood),
          note = VALUES(note),
          updated_at = CURRENT_TIMESTAMP
        `,
        [dateKey, mood || null, note || null]
      );
  
      const [rows] = await pool.query(
        "SELECT id, date_key, mood, note, created_at, updated_at FROM journal_entries WHERE date_key = ?",
        [dateKey]
      );
  
      res.status(200).json(rows[0]);
    } catch (err) {
      console.error("POST /api/journal error:", err);
      res.status(500).json({ error: "Server error" });
    }
  });
  
// PATCH /api/tasks/:id  -> update done status or text
app.patch("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { text, done } = req.body;

  try {
    // build dynamic update
    const fields = [];
    const values = [];

    if (typeof text === "string") {
      fields.push("text = ?");
      values.push(text);
    }

    if (typeof done === "boolean") {
      fields.push("done = ?");
      values.push(done ? 1 : 0);
    }

    if (!fields.length) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    values.push(id);

    await pool.query(
      `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    const [rows] = await pool.query(
      "SELECT id, text, done, created_at, source FROM tasks WHERE id = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /api/tasks/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/tasks/:id
app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM tasks WHERE id = ?", [id]);
    res.status(204).send();
  } catch (err) {
    console.error("DELETE /api/tasks/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- Weekly stats endpoint (optional but nice) ----------
app.get("/api/tasks/weekly", async (req, res) => {
  try {
    // last 7 days including today
    const [rows] = await pool.query(
      `
      SELECT 
        DATE(created_at) as day,
        SUM(done = 1) as completed
      FROM tasks
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY day
      ORDER BY day;
      `
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/tasks/weekly error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// start server
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
