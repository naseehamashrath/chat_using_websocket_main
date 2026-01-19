import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });
console.log("✅ WebSocket server running on ws://localhost:8080");

const rooms: Map<string, Set<WebSocket>> = new Map();
const socketToRoom: Map<WebSocket, string> = new Map();

function safeJsonParse(data: WebSocket.RawData): any | null {
  try {
    return JSON.parse(data.toString());
  } catch {
    return null;
  }
}

function broadcastToRoom(roomId: string, data: any, exclude?: WebSocket) {
  const room = rooms.get(roomId);
  if (!room) return;
  const message = JSON.stringify(data);
  room.forEach((ws) => {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

wss.on("connection", (socket) => {
  console.log("🔌 Client connected");

  socket.on("message", (raw) => {
    const data = safeJsonParse(raw);
    if (!data) return;

    const { type, payload } = data;

    if (type === "join") {
      const roomId = payload?.room;
      if (!roomId) return;

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId)!.add(socket);
      socketToRoom.set(socket, roomId);

      broadcastToRoom(roomId, {
        type: "system",
        payload: { message: "A new user joined the room." },
      }, socket);
    }

    if (type === "chat") {
      const roomId = socketToRoom.get(socket);
      if (!roomId || !payload?.message) return;
      broadcastToRoom(roomId, {
        type: "chat",
        payload: { message: payload.message },
      });
    }

    if (type === "typing") {
      const roomId = socketToRoom.get(socket);
      if (!roomId) return;
      broadcastToRoom(roomId, {
        type: "typing",
        payload: {},
      }, socket);
    }

    if (type === "leave") {
      const roomId = socketToRoom.get(socket);
      if (!roomId) return;
      rooms.get(roomId)?.delete(socket);
      socketToRoom.delete(socket);
      broadcastToRoom(roomId, {
        type: "system",
        payload: { message: "A user left the room." },
      });
    }
  });

  socket.on("close", () => {
    const roomId = socketToRoom.get(socket);
    if (!roomId) return;
    rooms.get(roomId)?.delete(socket);
    socketToRoom.delete(socket);
    broadcastToRoom(roomId, {
      type: "system",
      payload: { message: "A user disconnected." },
    });
  });
});
