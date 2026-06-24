import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import restaurantRoutes from "./routes/restaurants";
import sessionRoutes from "./routes/sessions";
import bookmarkRoutes from "./routes/bookmarks";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = req.headers.authorization;
    return auth ?? req.ip ?? "unknown";
  },
});

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    next();
    return;
  }
  limiter(req, res, next);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "hungr-backend" });
});

app.use("/api/restaurants", restaurantRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/bookmarks", bookmarkRoutes);

// Proxy everything else to the Expo Metro dev server (web, dev only)
if (process.env.NODE_ENV !== "production") {
  app.use(
    "/",
    createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: true,
      ws: true,
    })
  );
}

app.listen(PORT, () => {
  console.log(`Hungr backend running on port ${PORT}`);
});
