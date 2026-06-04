const { getDefaultConfig } = require("expo/metro-config");
const http = require("http");
const https = require("https");

const config = getDefaultConfig(__dirname);

/** Backend target for web dev proxy (avoids CORS from localhost:8081). */
const API_TARGET = (
  process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3000"
).replace(/\/$/, "");

config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    const path = req.url?.split("?")[0] ?? "";
    if (!path.startsWith("/api")) {
      return middleware(req, res, next);
    }

    const target = new URL(`${API_TARGET}${req.url}`);
    const transport = target.protocol === "https:" ? https : http;

    const proxyReq = transport.request(
      {
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: req.method,
        headers: {
          ...req.headers,
          host: target.host,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", (err) => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: `API proxy failed (${API_TARGET}): ${err.message}`,
        })
      );
    });

    req.pipe(proxyReq);
  };
};

module.exports = config;
