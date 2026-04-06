const express = require("express");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");

const app = express();

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY  
});

const knowledge = fs.existsSync("knowledge.txt")  
  ? fs.readFileSync("knowledge.txt", "utf-8")
  : "You are a helpful customer support agent.";

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
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
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Website running on port ${PORT}`);
});