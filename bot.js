const Groq = require("groq-sdk");
const readline = require("readline");
const fs = require("fs");
const pdfParse = require("pdf-parse");

const client = new Groq({
apiKey: process.env.GROQ_API_KEY
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function loadPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function chat(userMessage, knowledge) {
  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: `You are a helpful customer support agent.
Use ONLY the following information to answer questions.
If answer is not found, say "Please contact us directly."

BUSINESS INFORMATION:
${knowledge}`
      },
      {
        role: "user",
        content: userMessage
      }
    ]
  });
  return response.choices[0].message.content;
}

async function main() {
  console.log("Loading PDF knowledge base...");
  
  let knowledge = "";
  
  if (fs.existsSync("business.pdf")) {
    knowledge = await loadPDF("business.pdf");
    console.log("PDF loaded successfully!");
  } else if (fs.existsSync("knowledge.txt")) {
    knowledge = fs.readFileSync("knowledge.txt", "utf-8");
    console.log("Text knowledge base loaded!");
  } else {
    console.log("No knowledge base found!");
  }

  console.log("\nAI Customer Support Bot Started!");
  console.log("Type your message or type exit to quit\n");

  function askQuestion() {
    rl.question("You: ", async (userInput) => {
      if (userInput.toLowerCase() === "exit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }
      const reply = await chat(userInput, knowledge);
      console.log("Bot:", reply);
      console.log("");
      askQuestion();
    });
  }

  askQuestion();
}

main();