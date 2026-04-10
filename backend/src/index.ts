import express from "express";
import cors from "cors";
import recipesRouter from "./routes/recipes";
import calculatorRouter from "./routes/calculator";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use("/api/recipes", recipesRouter);
app.use("/api/calculate", calculatorRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
