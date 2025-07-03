const express = require("express");
const axios = require("axios");

const router = express.Router();

const OPENROUTER_API_KEY = "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";
const MODEL = "mistralai/mistral-7b-instruct";

// POST /chatbot/
router.post("/", async (req, res) => {
  const conversation = req.body.messages || [];
  if (!Array.isArray(conversation) || conversation.length === 0) {
    return res.status(400).json({ error: "Missing or invalid conversation messages" });
  }

  const headers = {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json"
  };

  const payload = {
    model: MODEL,
    messages: conversation,
    temperature: 0.7
  };

  try {
    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", payload, { headers });
    const reply = response.data.choices[0].message.content.trim();
    res.json({ reply });
  } catch (err) {
    const fallbackError = (err.response && err.response.data) ? err.response.data : err.message;
    console.error("❌ OpenRouter error:", fallbackError);
    res.status(500).json({ error: "Failed to get chatbot response", details: fallbackError });
  }
});

module.exports = router;
