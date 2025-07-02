const express = require("express");
const axios = require("axios");

const router = express.Router();

const EDAMAM_APP_ID = "bf0d5e78";
const EDAMAM_APP_KEY = "de9743bcc173d7920782af69fc25db75";
const OPENROUTER_API_KEY = "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";

// POST: Get recipe options
router.post("/recommendations", async (req, res) => {
  try {
    const { ingredients, cuisine } = req.body;

    const response = await axios.get("https://api.edamam.com/api/recipes/v2", {
      params: {
        type: "public",
        q: ingredients,
        app_id: EDAMAM_APP_ID,
        app_key: EDAMAM_APP_KEY,
        cuisineType: cuisine ? cuisine.toLowerCase().replace(" ", "-") : undefined,
        to: 10
      }
    });

    const recipes = response.data.hits.map((hit, index) => ({
      id: index,
      title: hit.recipe.label,
      image: hit.recipe.image,
      calories: Math.round(hit.recipe.calories)
    }));

    res.json({ matches: recipes });
  } catch (err) {
    res.status(500).json({ error: "Edamam error", details: err.message });
  }
});

// POST: Get full recipe details with preparation steps
router.post("/details", async (req, res) => {
  try {
    const { ingredients, cuisine, recipe_index = 0, people = 1 } = req.body;

    const response = await axios.get("https://api.edamam.com/api/recipes/v2", {
      params: {
        type: "public",
        q: ingredients,
        app_id: EDAMAM_APP_ID,
        app_key: EDAMAM_APP_KEY,
        cuisineType: cuisine ? cuisine.toLowerCase().replace(" ", "-") : undefined,
        to: 10
      }
    });

    const recipes = response.data.hits.map(hit => hit.recipe);
    const selected = recipes[recipe_index];

    const aiResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [{
          role: "user",
          content: `You are a professional chef. Write clear, step-by-step cooking instructions for the following recipe:\n\nTitle: "${selected.label}"`
        }],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );

    const steps = aiResponse.data.choices[0].message.content;

    res.json({
      title: selected.label,
      image: selected.image,
      calories: Math.round(selected.calories),
      ingredients: selected.ingredientLines,
      preparation_steps: steps
    });
  } catch (err) {
    res.status(500).json({ error: "AI integration failed", details: err.message });
  }
});

module.exports = router;
