const express = require("express");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const CHAT_MODEL = "llama-3.1-8b-instant";
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      business_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      product VARCHAR(255),
      amount DECIMAL,
      qty INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id)`);
  console.log("Database ready!");
}

const knowledge = fs.existsSync("knowledge.txt")
  ? fs.readFileSync("knowledge.txt", "utf-8")
  : "You are a helpful customer support agent.";

app.use(express.json());
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500
});
app.use(limiter);

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ✅ Fix - disable auto index.html serving
app.use(express.static(__dirname, { index: false }));

// Login page (default route)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// Dashboard (protected page)
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Chatbot (public page)
app.get("/chatbot", (req, res) => {
  res.sendFile(path.join(__dirname, "chatbot.html"));
});

// Signup
app.post("/api/signup", async (req, res, next) => {
  try {
    const { email, password, business_name } = req.body;

    if (!email || !password || !business_name) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password, business_name) VALUES ($1, $2, $3) RETURNING id, email, business_name",
      [email, hashedPassword, business_name]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

// Login
app.post("/api/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        business_name: user.business_name
      }
    });
  } catch (error) {
    next(error);
  }
});

// Save sale (protected)
app.post("/api/sales", authMiddleware, async (req, res, next) => {
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
      "INSERT INTO sales (user_id, product, amount, qty) VALUES ($1, $2, $3, $4)",
      [req.user.id, product.trim(), amountNum, qtyNum]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get sales (protected)
app.get("/api/sales", authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM sales WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// AI Predictions (protected)
app.get("/api/predictions", authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        product,
        SUM(qty) as total_qty,
        SUM(amount) as total_amount
      FROM sales
      WHERE created_at >= NOW() - INTERVAL '30 days'
      AND user_id = $1
      GROUP BY product
      ORDER BY total_qty DESC
    `, [req.user.id]);

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

// Chat (public)
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