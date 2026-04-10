import express from "express";
import cors from "cors";
import recipesRouter from "./routes/recipes";
import plannerRouter from "./routes/planner";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use("/api/recipes", recipesRouter);
app.use("/api/planner", plannerRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
