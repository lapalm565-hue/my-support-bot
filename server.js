const express = require("express");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const app = express();

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const CHAT_MODEL = "llama-3.1-8b-instant";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)`);
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

// Save sale
app.post("/api/sales", async (req, res, next) => {
  try {
    const { product, amount, qty } = req.body;

    if (typeof product !== "string" || product.trim() === "") {
      return res.status(400).json({ error: "Invalid product" });
    }

    const amountNum = Number(amount);
    const qtyNum = Number(qty);

    if (!Number.isFinite(amountNum) || amountNum < 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
      return res.status(400).json({ error: "Invalid qty" });
    }

    await pool.query(
      "INSERT INTO sales (product, amount, qty) VALUES ($1, $2, $3)",
      [product.trim(), amountNum, qtyNum]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get all sales
app.get("/api/sales", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM sales ORDER BY created_at DESC LIMIT 50"
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// AI Predictions
app.get("/api/predictions", async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        product,
        SUM(qty) as total_qty,
        SUM(amount) as total_amount
      FROM sales
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY product
      ORDER BY total_qty DESC
    `);

    const salesData = result.rows;

    if (salesData.length === 0) {
      return res.json({
        nextWeekSales: "Add more sales data first",
        bestProduct: "No data yet",
        restockAlert: "No data yet"
      });
    }

    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a business intelligence AI. Analyze sales data and give predictions.
Always respond in this exact JSON format with no extra text:
{
  "nextWeekSales": "₹X,XXX expected",
  "bestProduct": "Product name",
  "restockAlert": "Product name (X days left)"
}`
        },
        {
          role: "user",
          content: `Analyze this 30-day sales summary and predict: ${JSON.stringify(salesData)}`
        }
      ]
    });

    const raw = response.choices[0].message.content || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : clean;

    let predictions;
    try {
      predictions = JSON.parse(jsonText);
    } catch {
      predictions = {
        nextWeekSales: "Unable to predict",
        bestProduct: "Unable to predict",
        restockAlert: "Unable to predict"
      };
    }

    res.json(predictions);

  } catch (error) {
    next(error);
  }
});

// Chat
app.post("/chat", async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
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
    next(error);
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: "Something went wrong"
    }
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", async () => {
  await initDB();
  console.log(`Website running on port ${PORT}`);
});