import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

import { getConfig } from "./config.js";
import { createHealthPayload } from "./health.js";
import { registerSocketHandlers } from "./socket-server.js";

const config = getConfig();
const app = express();

app.use(
  cors({
    origin: config.clientOrigins
  })
);

app.get("/health", (_request, response) => {
  response.json(createHealthPayload());
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.clientOrigins,
    methods: ["GET", "POST"]
  }
});

registerSocketHandlers(io);

httpServer.listen(config.port, () => {
  console.log(`Oppassum signaling server listening on port ${config.port}`);
});
