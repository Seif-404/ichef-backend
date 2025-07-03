const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();

if (!admin.apps.length) {
  admin.initializeApp(); // ✅ This line is required
}
const db = admin.firestore(); // ✅ Safe now

const mealPlansCollection = db.collection("mealPlans");

// POST: Add a meal plan
router.post("/plan", async (req, res) => {
  try {
    const { user_id, date, time, recipe } = req.body;
    if (!user_id || !date || !time || !recipe) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newMealRef = await mealPlansCollection.add({
      user_id,
      date,
      time,
      recipe,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({ id: newMealRef.id, message: "Meal planned." });
  } catch (err) {
    console.error("Error saving meal plan:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET: Get planned meals for a user
router.get("/plan", async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "Missing user_id" });

    const snapshot = await mealPlansCollection
      .where("user_id", "==", user_id)
      .orderBy("date")
      .get();

    const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ plans });
  } catch (err) {
    console.error("Error fetching meal plans:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT: Edit a meal plan
router.put("/plan/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await mealPlansCollection.doc(id).update(updates);
    res.json({ message: "Meal plan updated." });
  } catch (err) {
    console.error("Error updating meal plan:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE: Remove a meal plan
router.delete("/plan/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await mealPlansCollection.doc(id).delete();
    res.json({ message: "Meal plan deleted." });
  } catch (err) {
    console.error("Error deleting meal plan:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;