import express from "express";
import { createServer } from "node:http";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initializeCache } from "./lib/cache.js";
import apiRouter from "./routes/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize cache in the background
setTimeout(initializeCache, 1000);

const app = express();
const server = createServer(app);

app.use(morgan("combined"));
app.use(cookieParser());

// Serve static frontend files first
const publicPath = path.join(__dirname, "public");
app.use("/", express.static(publicPath));

// API routes
app.use("/api", apiRouter);

server.listen(4000, () => {
  console.log("Listening for requests on port 4000");
});

// Graceful shutdown handlers
const shutdown = () => {
  console.log("Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
