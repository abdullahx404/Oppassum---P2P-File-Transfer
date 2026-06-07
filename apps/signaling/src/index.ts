import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

import { SERVER_EVENTS } from "@oppassum/shared";

import { getConfig } from "./config.js";
import { createHealthPayload } from "./health.js";

const config = getConfig();
const app = express();

app.use(
  cors({
    origin: config.clientOrigin
  })
);

app.get("/health", (_request, response) => {
  response.json(createHealthPayload());
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.clientOrigin,
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  socket.emit(SERVER_EVENTS.EVENT_ERROR, {
    code: "not_implemented",
    message: "Room discovery will be implemented in Phase 3."
  });
});

httpServer.listen(config.port, () => {
  console.log(`Oppassum signaling server listening on port ${config.port}`);
});
