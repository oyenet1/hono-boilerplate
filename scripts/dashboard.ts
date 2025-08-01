import { Hono } from "hono";
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { appQueue } from "../src/jobs/app-queue";

const app = new Hono();

// Setup Bull Board UI with Hono adapter
const serverAdapter = new HonoAdapter((serveStatic) =>
  serveStatic({
    root: "./",
  })
);

const { addQueue } = createBullBoard({
  queues: [new BullAdapter(appQueue)],
  serverAdapter: serverAdapter,
});

// Mount the dashboard
app.route("/", serverAdapter.registerPlugin());

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "BullMQ Dashboard running",
    timestamp: new Date().toISOString(),
    queues: ["app-operations"],
  });
});

// Dashboard info endpoint
app.get("/info", (c) => {
  return c.json({
    message: "BullMQ Dashboard Server",
    dashboard: "/ui",
    health: "/health",
    description: "Monitor your app queue operations",
  });
});

const PORT = process.env.DASHBOARD_PORT || 3001;

console.log(`🎛️  BullMQ Dashboard Server Starting...`);
console.log(`📊 Dashboard URL: http://localhost:${PORT}/ui`);
console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
console.log(`📋 Queue: app-operations`);
console.log(`⚡ Ready to monitor queue operations!`);

export default {
  port: PORT,
  fetch: app.fetch,
};
