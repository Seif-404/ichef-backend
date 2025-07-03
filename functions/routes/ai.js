const express = require("express");
const axios = require("axios");
const admin = require("firebase-admin");

const router = express.Router();

const EDAMAM_APP_ID = "bf0d5e78";
const EDAMAM_APP_KEY = "de9743bcc173d7920782af69fc25db75";
const OPENROUTER_API_KEY = "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";

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Helper function to filter recipes based on allergies
function filterByAllergies(recipes, allergies) {
  if (!Array.isArray(allergies) || allergies.length === 0) return recipes;

  return recipes.filter(hit => {
    const ingredients = hit.recipe.ingredientLines.join(" ").toLowerCase();
    return !allergies.some(allergy => ingredients.includes(allergy.toLowerCase()));
  });
}

// POST: Get recipe options
router.post("/recommendations", async (req, res) => {
  try {
    const { user_id, ingredients, cuisine } = req.body;

    // Get user allergies from Firestore
    let allergies = [];
    if (user_id) {
      const userDoc = await db.collection("users").doc(user_id).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        allergies = data.allergies || data.intolerances || [];
      }
    }

    // Fetch recipes from Edamam
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

    const filtered = filterByAllergies(response.data.hits, allergies);
    const recipes = filtered.map((hit, index) => ({
      id: index,
      title: hit.recipe.label,
      image: hit.recipe.image,
      calories: Math.round(hit.recipe.calories)
    }));

    res.json({ matches: recipes });
  } catch (err) {
    console.error("Recommendations error:", err);
    res.status(500).json({ error: "Edamam error", details: err.message });
  }
});

// POST: Get full recipe details
router.post("/details", async (req, res) => {
  try {
    const { user_id, ingredients, cuisine, recipe_index = 0, people = 1 } = req.body;

    // Get user allergies
    let allergies = [];
    if (user_id) {
      const userDoc = await db.collection("users").doc(user_id).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        allergies = data.allergies || data.intolerances || [];
      }
    }

    // Fetch and filter recipes
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

    const filtered = filterByAllergies(response.data.hits, allergies);
    const recipes = filtered.map(hit => hit.recipe);

    if (recipe_index >= recipes.length) {
      return res.status(400).json({ error: "Invalid recipe index after filtering." });
    }

    const selected = recipes[recipe_index];

    // Get preparation steps from AI
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
    console.error("Details error:", err);
    res.status(500).json({ error: "AI integration failed", details: err.message });
  }
});

module.exports = router;
