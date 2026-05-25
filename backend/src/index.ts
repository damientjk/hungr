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
app.use(cors({ origin: true }));
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Rate limit per user (via auth header) rather than per IP,
      // so multiple users sharing a Codespaces IP don't block each other.
      const auth = req.headers.authorization;
      return auth ?? req.ip ?? "unknown";
    },
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "hungr-backend" });
});

app.use("/api/restaurants", restaurantRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/bookmarks", bookmarkRoutes);

// Proxy everything else to the Expo Metro dev server (web)
app.use(
  "/",
  createProxyMiddleware({
    target: "http://localhost:8081",
    changeOrigin: true,
    ws: true,
  })
);

app.listen(PORT, () => {
  console.log(`Hungr backend running on port ${PORT}`);
});
