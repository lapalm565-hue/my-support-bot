const express = require("express");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const app = express();

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create tables if not exists
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      product VARCHAR(255),
      amount DECIMAL,
      qty INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("Database ready!");
}

const knowledge = fs.existsSync("knowledge.txt")
  ? fs.readFileSync("knowledge.txt", "utf-8")
  : "You are a helpful customer support agent.";

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Save sale to database
app.post("/api/sales", async (req, res) => {
  try {
    const { product, amount, qty } = req.body;
    await pool.query(
      "INSERT INTO sales (product, amount, qty) VALUES ($1, $2, $3)",
      [product, amount, qty]
    );
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get all sales
app.get("/api/sales", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM sales ORDER BY created_at DESC LIMIT 50"
    );
    res.json(result.rows);
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are a helpful customer support agent. 
Use this business information to answer:
${knowledge}`
        },
        { role: "user", content: message }
      ]
    });
    res.json({ reply: response.choices[0].message.content });
  } catch (error) {
    res.json({ reply: "Sorry, something went wrong. Please try again!" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", async () => {
  await initDB();
  console.log(`Website running on port ${PORT}`);
});