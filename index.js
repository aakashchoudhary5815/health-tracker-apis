const express = require("express");

const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const axios = require("axios");
const url =
  "mongodb+srv://sidsatsonak47:sidsatsonak47@cluster0.auffoxi.mongodb.net/";
const port = 8080;

app.use(bodyParser.json());

const connectionParams = {
  useNewUrlParser: true,
};

mongoose
  .connect(url, connectionParams)
  .then(() => {
    console.log("Connected to database ");
  })
  .catch((err) => {
    console.error(`Error connecting to the database. \n${err}`);
  });

// --------------- User Authentication -----------------

// Define User Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  age: Number,
  gender: String,
});

const User = mongoose.model("User", userSchema);

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username },
    "your_secret_key",
    { expiresIn: "1h" }
  );
};

// Register User
app.post("/register", async (req, res) => {
  const { username, password, name, age, gender } = req.body;

  // Check if the username already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ message: "Username already exists" });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a new user
  const newUser = new User({
    username,
    password: hashedPassword,
    name,
    age,
    gender,
  });
  await newUser.save();

  // Generate and send JWT token
  const token = generateToken(newUser);
  res
    .status(201)
    .json({ success: true, message: "You are registered successfully" });
});

// Login Route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Find the user in the database
  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  // Compare the provided password with the hashed password in the database
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  // Generate and send JWT token
  const token = generateToken(user);
  res.status(200).json({ message: "You are logged in", user, token });
});

// ---------------- CRUD Health Tracker Actions -----------------

// Health Record Schema
const healthRecordSchema = new mongoose.Schema({
  weight: { type: Number, required: true },
  bloodPressure: {
    systolic: { type: Number, required: true },
    diastolic: { type: Number, required: true },
  },
  heartRate: { type: Number, required: true },
  // New diet-related fields
  meals: [
    {
      name: { type: String, required: true },
      calories: { type: Number, required: true },
    },
  ],
  totalCalories: { type: Number, required: true },
});

// Sleep Records Schema
const sleepRecordSchema = new mongoose.Schema({
  duration: { type: Number, required: true }, // in minutes
});

const HealthRecord = mongoose.model("HealthRecord", healthRecordSchema);
const SleepRecord = mongoose.model("SleepRecord", sleepRecordSchema);

// Create a health record
app.post("/health", async (req, res) => {
  try {
    const newRecord = new HealthRecord(req.body);
    const savedRecord = await newRecord.save();
    res.json(savedRecord);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all health records
app.get("/allHealthRecords", async (req, res) => {
  try {
    const records = await HealthRecord.find();
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific health record by ID
app.get("/health/:id", async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a specific health record by ID
app.put("/health/:id", async (req, res) => {
  try {
    const updatedRecord = await HealthRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedRecord) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json(updatedRecord);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a specific health record by ID
app.delete("/health/:id", async (req, res) => {
  try {
    const deletedRecord = await HealthRecord.findByIdAndDelete(req.params.id);
    if (!deletedRecord) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json({ message: "Record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -------------- DIET ANALYSIS -----------------

// Add meals to a health record
app.post("/health/:id/meals", async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    const meal = req.body;
    record.meals.push(meal);
    record.totalCalories += meal.calories;

    const updatedRecord = await record.save();
    res.json(updatedRecord);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all meals for a specific health record
app.get("/health/:id/meals", async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json(record.meals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Analyze the diet of a specific health record
app.get("/health/:id/analyze-diet", async (req, res) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json({ totalCalories: record.totalCalories, meals: record.meals });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -------------------- SLEEP ANALYSIS ---------------------

// Create a sleep record
app.post("/sleep", async (req, res) => {
  try {
    const newRecord = new SleepRecord(req.body);
    const savedRecord = await newRecord.save();
    res.json(savedRecord);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all sleep records
app.get("/sleeprecords", async (req, res) => {
  try {
    const records = await SleepRecord.find();
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific sleep record by ID
app.get("/sleep/:id", async (req, res) => {
  try {
    const record = await SleepRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a specific sleep record by ID
app.put("/sleep/:id", async (req, res) => {
  try {
    const updatedRecord = await SleepRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedRecord) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json(updatedRecord);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a specific sleep record by ID
app.delete("/sleep/:id", async (req, res) => {
  try {
    const deletedRecord = await SleepRecord.findByIdAndDelete(req.params.id);
    if (!deletedRecord) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json({ message: "Record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ---------------- Additional Third party API Integration --------------------

// API Route
app.post("/get-nutrition", async (req, res) => {
  try {
    const { ingredient } = req.body;

    const nutritionData = await getNutritionDataFromApi(ingredient);
    res.json({
      success: true,
      data: nutritionData,
      message: "Details fetched successfully.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Implementing Third Party API
async function getNutritionDataFromApi(foodName) {
  const apiEndpoint = "https://api.edamam.com/api/nutrition-data";
  const app_id = "0c19aa31";
  const app_key = "ff84d028bdb2c6825dbecc5000c57fe7";

  try {
    // Make a request to the nutrition API
    const response = await axios.get(apiEndpoint, {
      params: { app_id, app_key, "nutrition-type": "cooking", ingr: foodName },
    });

    // Extract nutrition data from the API response
    const nutritionData = response.data;
    return nutritionData;
  } catch (error) {
    // Handle API error (you may want to log the error or return a specific response)
    console.error(error);
    throw new Error("Error fetching nutrition data from API");
  }
}

app.get("/", (req, res) => {
  res.send("Hello, Express!");
});
app.listen(port, () => {
  console.log(`Server is runiing on port ${port}`);
});

module.exports = app;
