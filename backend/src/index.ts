import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import restaurantRoutes from "./routes/restaurants";
import sessionRoutes from "./routes/sessions";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*" }));
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "hungr-backend" });
});

app.use("/api/restaurants", restaurantRoutes);
app.use("/api/sessions", sessionRoutes);

app.listen(PORT, () => {
  console.log(`Hungr backend running on port ${PORT}`);
});
