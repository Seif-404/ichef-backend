const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

const aiRoutes = require("./routes/ai");
const chatbotRoutes = require("./routes/chatbot"); // ✅ Add this
const mealRoutes = require("./routes/mealplan");

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

app.use("/ai", aiRoutes);
app.use("/chatbot", chatbotRoutes); // ✅ New route
app.use("/mealplan", mealRoutes);

app.get("/", (req, res) => {res.send("✅ iChef backend is up");});

exports.api = functions.https.onRequest(app);