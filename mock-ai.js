const express = require("express");
const app = express();

app.use(express.json());

// Load PORT from environment, default to 8000
const PORT = process.env.PORT || 8000;
const API_KEY = process.env.AI_API_KEY || "AI-API-KEY";
const aiTasks = new Map();

// ==========================================
// MIDDLEWARE: SECURITY
// ==========================================
app.use((req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ message: "Unauthorized access" });
  }
  next();
});

// ==========================================
// ENDPOINT: MATCHING RESEP
// ==========================================
app.post("/ai/cooking/match", (req, res) => {
  const { recipe_id } = req.body;

  if (!recipe_id) {
    return res.status(200).json({
      message: "Matching successful",
      data: [
        { recipe_id: "6a1d2e30976fdec82ee98868", match_percentage: Math.floor(Math.random() * 50) + 50 },
        { recipe_id: "6a1d2e30976fdec82ee9889f", match_percentage: Math.floor(Math.random() * 50) + 50 },
        { recipe_id: "6a1d2e30976fdec82ee988e1", match_percentage: Math.floor(Math.random() * 50) + 50 },
      ],
    });
  } 
  
  console.log(`[AI-MATCH] Checking recipe compatibility: ${recipe_id}`);
  const percentage = Math.floor(Math.random() * 50) + 50;
  return res.status(200).json({
    message: "Comparing successful",
    data: [{ recipe_id: recipe_id, match_percentage: percentage }],
  });
});

// ==========================================
// ENDPOINT: AI SUBSTITUTION (TRIGGER)
// ==========================================
app.post("/ai/cooking/ai-substitution", (req, res) => {
  const { task_id, missing_ingredients, surplus_ingredients } = req.body;
  console.log(`[AI-SUBSTITUTE] Processing task: ${task_id}`);

  // Immediate response to prevent request timeout
  res.status(202).json({ message: "Processing started", task_id: task_id });

  // Simulate AI processing latency
  setTimeout(() => {
    let result = {};
    const hasCoreMissing = missing_ingredients.some((ing) => ing.is_core);
    const hasSurplus = surplus_ingredients && surplus_ingredients.length > 0;

    if (hasCoreMissing && !hasSurplus) {
      result = {
        status: "completed",
        result: {
          character: {
            status: "fail",
            dialog: "Waduh... Bahan utamanya hilang dan tidak ada bahan pengganti. Mending kita masak yang lain saja, Chef!",
          },
          substitutions_mapping: [],
        },
      };
    } else if (hasCoreMissing && hasSurplus) {
      result = {
        status: "completed",
        result: {
          character: {
            status: "fully_success",
            dialog: `Aha! Youri punya ide jenius! Kita bisa ganti ${missing_ingredients[0].name} dengan ${surplus_ingredients[0].name}.`,
          },
          substitutions_mapping: [{
            missing_item: missing_ingredients[0],
            replaced_with: surplus_ingredients[0],
          }],
        },
      };
    } else {
      result = {
        status: "completed",
        result: {
          character: {
            status: "mid_success",
            dialog: `Tenang Chef! Walaupun ${missing_ingredients[0].name} tidak tersedia, masakanmu akan tetap lezat.`,
          },
          substitutions_mapping: [],
        },
      };
    }

    aiTasks.set(task_id, result);
    console.log(`[AI-SUBSTITUTE] Task ${task_id} finished. Scenario: ${result.result.character.status}`);
  }, 5000);
});

// ==========================================
// ENDPOINT: POLLING AI RESULT
// ==========================================
app.get("/ai/cooking/ai-result/:task_id", (req, res) => {
  const { task_id } = req.params;

  if (!aiTasks.has(task_id)) {
    return res.status(200).json({
      message: "Processing in progress",
      data: { status: "processing", result: null },
    });
  }

  const taskData = aiTasks.get(task_id);
  aiTasks.delete(task_id);

  return res.status(200).json({
    message: "Success",
    data: taskData,
  });
});

app.listen(PORT, () => console.log(`[Mock AI] Service active on port: ${PORT}`));