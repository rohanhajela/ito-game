import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { randomUUID } from 'crypto';

type Phase = 'LOBBY' | 'ORDERING' | 'REVEAL';
type PlayerID = string;
type RoomCode = string;

interface Player {
  id: PlayerID;
  name: string;
  isHost: boolean;
  number: number | null;
  connected: boolean;
  socketId: string;
}

interface Room {
  code: RoomCode;
  hostId: PlayerID;
  players: Player[];
  phase: Phase;
  currentOrder: PlayerID[];
  finalOrder: PlayerID[] | null;
  createdAt: number;
}

const rooms = new Map<RoomCode, Room>();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // dev-friendly; tighten in prod
  },
});

function generateRoomCode(): RoomCode {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

function assignNumbers(room: Room) {
  const pool = Array.from({ length: 100 }, (_, i) => i + 1);
  for (const player of room.players) {
    const idx = Math.floor(Math.random() * pool.length);
    const n = pool[idx];
    pool.splice(idx, 1);
    player.number = n;
  }
}

function sanitizeRoomForClient(
  room: Room,
  revealNumbers: boolean
): Omit<Room, 'players'> & {
  players: Omit<Player, 'socketId'>[];
} {
  return {
    ...room,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      connected: p.connected,
      number: revealNumbers ? p.number : null,
    })),
  };
}

function sanitizePlayerForClient(player: Player): Omit<Player, 'socketId'> {
  const { socketId, ...rest } = player;
  return rest;
}

function emitRoomState(room: Room) {
  const revealNumbers = room.phase === 'REVEAL';

  for (const p of room.players) {
    const socket = io.sockets.sockets.get(p.socketId);
    if (!socket) continue;

    socket.emit('ROOM_STATE', {
      room: sanitizeRoomForClient(room, revealNumbers),
      you: sanitizePlayerForClient(p),
    });
  }
}

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  socket.on('CREATE_ROOM', ({ name }) => {
    const code = generateRoomCode();
    const playerId = randomUUID();

    const host: Player = {
      id: playerId,
      name: name || 'Host',
      isHost: true,
      number: null,
      connected: true,
      socketId: socket.id,
    };

    const room: Room = {
      code,
      hostId: playerId,
      players: [host],
      phase: 'LOBBY',
      currentOrder: [playerId],
      finalOrder: null,
      createdAt: Date.now(),
    };

    rooms.set(code, room);
    socket.join(code);
    emitRoomState(room);
  });

  socket.on('JOIN_ROOM', ({ code, name }) => {
    const normalizedCode = (code || '').trim().toUpperCase();
    const room = rooms.get(normalizedCode);
    if (!room) {
      socket.emit('ERROR', { message: 'Room not found' });
      return;
    }

    const playerId = randomUUID();
    const player: Player = {
      id: playerId,
      name: name || 'Player',
      isHost: false,
      number: null,
      connected: true,
      socketId: socket.id,
    };

    room.players.push(player);
    room.currentOrder.push(playerId);
    socket.join(normalizedCode);
    emitRoomState(room);
  });

  socket.on('START_GAME', ({ code }) => {
    const normalizedCode = (code || '').trim().toUpperCase();
    const room = rooms.get(normalizedCode);
    if (!room) return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player || !player.isHost) return;

    assignNumbers(room);
    room.phase = 'ORDERING';
    room.finalOrder = null;
    room.currentOrder = room.players.map((p) => p.id);
    emitRoomState(room);
  });

  socket.on('UPDATE_ORDER', ({ code, orderedPlayerIds }) => {
    const normalizedCode = (code || '').trim().toUpperCase();
    const room = rooms.get(normalizedCode);
    if (!room) return;
    if (room.phase !== 'ORDERING') return;

    if (!Array.isArray(orderedPlayerIds)) return;
    if (orderedPlayerIds.length !== room.players.length) return;

    const validIds = new Set(room.players.map((p) => p.id));
    if (!orderedPlayerIds.every((id: string) => validIds.has(id))) return;

    room.currentOrder = orderedPlayerIds;
    emitRoomState(room);
  });

  socket.on('REVEAL_NUMBERS', ({ code }) => {
    const normalizedCode = (code || '').trim().toUpperCase();
    const room = rooms.get(normalizedCode);
    if (!room) return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player || !player.isHost) return;

    room.phase = 'REVEAL';
    room.finalOrder = [...room.currentOrder];
    emitRoomState(room);
  });

  socket.on('PLAY_AGAIN', ({ code }) => {
    const normalizedCode = (code || '').trim().toUpperCase();
    const room = rooms.get(normalizedCode);
    if (!room) return;

    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player || !player.isHost) return;

    assignNumbers(room);
    room.phase = 'ORDERING';
    room.currentOrder = room.players.map((p) => p.id);
    room.finalOrder = null;
    emitRoomState(room);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    for (const room of rooms.values()) {
      let changed = false;
      for (const p of room.players) {
        if (p.socketId === socket.id) {
          p.connected = false;
          changed = true;
        }
      }
      if (changed) emitRoomState(room);
    }
  });
});

// ---- Static serving for prod (optional, once client is built) ----
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
