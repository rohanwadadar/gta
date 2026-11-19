import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  type ChatMessage,
  type CommunityMission,
  INITIAL_OFFICIAL_MISSIONS,
  type PlayerProfile,
  type RemotePlayerState,
  WORLD_SIZE,
  createDefaultProfile,
} from './src/shared/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'world-state.json');

interface PersistedWorldData {
  profiles: Record<string, PlayerProfile>;
  missions: CommunityMission[];
}

let worldData: PersistedWorldData = {
  profiles: {},
  missions: [...INITIAL_OFFICIAL_MISSIONS],
};

function loadWorldData(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedWorldData>;
      if (parsed.profiles && typeof parsed.profiles === 'object') {
        worldData.profiles = parsed.profiles;
      }
      if (Array.isArray(parsed.missions) && parsed.missions.length > 0) {
        // Ensure official missions exist alongside community missions
        const existingIds = new Set(parsed.missions.map((m) => m.id));
        const merged = [...parsed.missions];
        for (const official of INITIAL_OFFICIAL_MISSIONS) {
          if (!existingIds.has(official.id)) {
            merged.push(official);
          }
        }
        worldData.missions = merged;
      }
    }
  } catch (err) {
    console.warn('Could not load persisted world-state.json, starting fresh:', err);
  }
}

let saveTimer: NodeJS.Timeout | null = null;
function schedulePersist(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(worldData, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to persist world state:', err);
    }
  }, 800);
}

loadWorldData();

// Live in-memory multiplayer state
interface ConnectedClient {
  ws: WebSocket;
  uid: string;
}

const clients = new Map<WebSocket, ConnectedClient>();
const livePlayers = new Map<string, RemotePlayerState>();
const chatHistory: ChatMessage[] = [
  {
    id: 'sys-welcome',
    uid: 'SERVER',
    name: 'Furfuri Radio',
    characterId: 'chingum',
    text: 'Welcome to Furfuri Nagri! Drive to Raju Garage to customize your ride or open Missions to earn ₹.',
    timestamp: Date.now(),
    system: true,
  },
];

function broadcast(payload: unknown, excludeWs?: WebSocket): void {
  const str = JSON.stringify(payload);
  for (const [ws] of clients) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(str);
    }
  }
}

function getLeaderboard() {
  return Object.values(worldData.profiles)
    .sort((a, b) => b.rupees + b.xp - (a.rupees + a.xp))
    .slice(0, 10)
    .map((p) => ({
      uid: p.uid,
      name: p.name,
      characterId: p.characterId,
      rupees: p.rupees,
      level: p.level,
      missionsDone: p.stats.missionsDone,
    }));
}

function mergeProfile(existing: PlayerProfile | undefined, incoming: Partial<PlayerProfile>, uid: string): PlayerProfile {
  const base = existing ? { ...existing } : createDefaultProfile(uid, incoming.name, incoming.characterId);
  const ownedSet = new Set([...(base.ownedVehicles || ['auto', 'bullet']), ...(incoming.ownedVehicles || [])]);
  const completedSet = new Set([...(base.completedMissionIds || []), ...(incoming.completedMissionIds || [])]);

  const incomingUpdated = typeof incoming.updatedAt === 'number' ? incoming.updatedAt : Date.now();
  const isNewer = incomingUpdated >= (base.updatedAt || 0);

  const merged: PlayerProfile = {
    uid: base.uid,
    name: (incoming.name || base.name).trim().slice(0, 18) || base.name,
    characterId: incoming.characterId || base.characterId,
    rupees: isNewer && typeof incoming.rupees === 'number' ? Math.max(0, Math.round(incoming.rupees)) : Math.max(base.rupees, incoming.rupees || 0),
    xp: Math.max(base.xp, incoming.xp || 0),
    level: Math.max(1, Math.floor(Math.max(base.xp, incoming.xp || 0) / 500) + 1),
    ownedVehicles: Array.from(ownedSet),
    activeVehicleType: incoming.activeVehicleType || base.activeVehicleType,
    garageConfigs: {
      ...base.garageConfigs,
      ...(incoming.garageConfigs || {}),
    },
    completedMissionIds: Array.from(completedSet),
    stats: {
      distanceKm: Math.max(base.stats.distanceKm, incoming.stats?.distanceKm || 0),
      missionsDone: Math.max(base.stats.missionsDone, incoming.stats?.missionsDone || 0),
      samosasEaten: Math.max(base.stats.samosasEaten, incoming.stats?.samosasEaten || 0),
      kills: Math.max(base.stats.kills || 0, incoming.stats?.kills || 0),
    },
    updatedAt: Math.max(base.updatedAt || 0, incomingUpdated),
  };

  worldData.profiles[base.uid] = merged;
  schedulePersist();
  return merged;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  // Lightweight SSR bootstrap payload helper
  function getInitialWorldPayload() {
    return {
      onlineCount: livePlayers.size,
      missions: worldData.missions.slice(0, 40),
      leaderboard: getLeaderboard(),
      serverTime: Date.now(),
    };
  }

  // REST API: Bootstrap player UID & world metadata
  app.get('/api/bootstrap', (req, res) => {
    const rawUid = String(req.query.uid || '').trim().toUpperCase().slice(0, 16);
    const uid = rawUid || `IND-${Math.floor(1000 + Math.random() * 9000)}`;
    let profile = worldData.profiles[uid];
    if (!profile) {
      profile = createDefaultProfile(uid);
      worldData.profiles[uid] = profile;
      schedulePersist();
    }
    res.json({
      profile,
      missions: worldData.missions,
      leaderboard: getLeaderboard(),
      chatHistory: chatHistory.slice(-40),
      onlineCount: livePlayers.size,
    });
  });

  // REST API: Sync player profile (handles offline queue reconnect flush idempotently)
  app.post('/api/profile/sync', (req, res) => {
    const body = req.body as Partial<PlayerProfile> | undefined;
    const rawUid = String(body?.uid || '').trim().toUpperCase().slice(0, 16);
    if (!rawUid) {
      res.status(400).json({ error: 'UID is required' });
      return;
    }
    const merged = mergeProfile(worldData.profiles[rawUid], body || {}, rawUid);
    res.json({ profile: merged, leaderboard: getLeaderboard() });
  });

  // REST API: List community & official missions
  app.get('/api/missions', (_req, res) => {
    res.json({ missions: worldData.missions });
  });

  // REST API: Create a new community-driven mission (idempotent by id)
  app.post('/api/missions', (req, res) => {
    const body = req.body as Partial<CommunityMission>;
    const title = String(body.title || '').trim().slice(0, 48);
    const description = String(body.description || '').trim().slice(0, 160);
    if (!title || !description) {
      res.status(400).json({ error: 'Title and description are required' });
      return;
    }

    const missionId = String(body.id || `cmis-${Date.now()}-${Math.floor(Math.random() * 9999)}`);
    const existing = worldData.missions.find((m) => m.id === missionId);
    if (existing) {
      res.json({ mission: existing, deduplicated: true });
      return;
    }

    const validTypes = new Set(['delivery', 'collect', 'race', 'takedown']);
    const validDiffs = new Set(['Easy', 'Medium', 'Desi Chaos']);
    const difficulty = validDiffs.has(String(body.difficulty)) ? (body.difficulty as CommunityMission['difficulty']) : 'Medium';
    const rewardCap = difficulty === 'Easy' ? 900 : difficulty === 'Medium' ? 1400 : 2000;
    const reward = Math.min(rewardCap, Math.max(300, Math.round(Number(body.reward) || 850)));

    const newMission: CommunityMission = {
      id: missionId,
      title,
      description,
      type: validTypes.has(String(body.type)) ? (body.type as CommunityMission['type']) : 'delivery',
      authorUid: String(body.authorUid || 'ANON').slice(0, 16),
      authorName: String(body.authorName || 'Desi Creator').slice(0, 18),
      districtId: String(body.districtId || 'chai_chowk'),
      targetDistrictId: String(body.targetDistrictId || 'furfuri_bazaar'),
      reward,
      difficulty,
      upvotes: 1,
      completions: 0,
      createdAt: typeof body.createdAt === 'number' ? body.createdAt : Date.now(),
      isOfficial: false,
    };

    worldData.missions.unshift(newMission);
    if (worldData.missions.length > 80) {
      // Keep official missions + most recent community missions
      const officials = worldData.missions.filter((m) => m.isOfficial);
      const community = worldData.missions.filter((m) => !m.isOfficial).slice(0, 60);
      worldData.missions = [...community, ...officials];
    }
    schedulePersist();

    broadcast({ type: 'mission:created', mission: newMission });
    res.status(201).json({ mission: newMission });
  });

  // REST API: Upvote community mission
  app.post('/api/missions/:id/upvote', (req, res) => {
    const mission = worldData.missions.find((m) => m.id === req.params.id);
    if (!mission) {
      res.status(404).json({ error: 'Mission not found' });
      return;
    }
    mission.upvotes += 1;
    schedulePersist();
    broadcast({ type: 'mission:updated', mission });
    res.json({ mission });
  });

  // REST API: Complete mission
  app.post('/api/missions/:id/complete', (req, res) => {
    const mission = worldData.missions.find((m) => m.id === req.params.id);
    if (mission) {
      mission.completions += 1;
      schedulePersist();
      broadcast({ type: 'mission:updated', mission });
    }
    res.json({ ok: true, mission: mission || null });
  });

  const server = http.createServer(app);

  // WebSocket Server for low-latency multiplayer sync & real-time chat
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let boundUid = '';

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (!msg || typeof msg.type !== 'string') return;

        if (msg.type === 'player:join') {
          const uid = String(msg.uid || '').trim().toUpperCase().slice(0, 16);
          if (!uid) return;
          boundUid = uid;
          clients.set(ws, { ws, uid });

          const playerState: RemotePlayerState = {
            uid,
            name: String(msg.name || uid).slice(0, 18),
            characterId: msg.characterId || 'motu',
            x: Number(msg.x) || 2800,
            y: Number(msg.y) || 2980,
            angle: Number(msg.angle) || 0,
            vx: 0,
            vy: 0,
            inVehicleType: msg.inVehicleType || null,
            vehicleConfig: msg.vehicleConfig || null,
            weaponId: msg.weaponId || 'pistol',
            specialActive: false,
            specialTimer: 0,
            wantedLevel: 0,
            hp: 100,
            maxHp: 100,
            emote: null,
            emoteTime: 0,
            lastSeen: Date.now(),
          };
          livePlayers.set(uid, playerState);

          // Send initial world snapshot to joining client
          ws.send(
            JSON.stringify({
              type: 'world:init',
              players: Array.from(livePlayers.values()),
              chatHistory: chatHistory.slice(-40),
              missions: worldData.missions,
              onlineCount: livePlayers.size,
            })
          );

          // Broadcast join notice
          const joinChat: ChatMessage = {
            id: `sys-join-${uid}-${Date.now()}`,
            uid: 'SERVER',
            name: 'Furfuri Radio',
            characterId: playerState.characterId,
            text: `${playerState.name} (${uid}) joined Furfuri 3D!`,
            timestamp: Date.now(),
            system: true,
          };
          chatHistory.push(joinChat);
          if (chatHistory.length > 60) chatHistory.shift();
          broadcast({ type: 'chat:message', message: joinChat });
          broadcast({ type: 'player:joined', player: playerState, onlineCount: livePlayers.size }, ws);
          return;
        }

        if (msg.type === 'player:state' && boundUid) {
          const existing = livePlayers.get(boundUid);
          if (existing) {
            existing.x = Math.max(40, Math.min(WORLD_SIZE - 40, Number(msg.x) || existing.x));
            existing.y = Math.max(40, Math.min(WORLD_SIZE - 40, Number(msg.y) || existing.y));
            existing.angle = Number(msg.angle) || 0;
            existing.vx = Number(msg.vx) || 0;
            existing.vy = Number(msg.vy) || 0;
            existing.characterId = msg.characterId || existing.characterId;
            existing.name = String(msg.name || existing.name).slice(0, 18);
            existing.inVehicleType = msg.inVehicleType ?? null;
            existing.vehicleConfig = msg.vehicleConfig ?? null;
            existing.weaponId = msg.weaponId || existing.weaponId || 'pistol';
            existing.specialActive = Boolean(msg.specialActive);
            existing.wantedLevel = Number(msg.wantedLevel) || 0;
            existing.hp = Number(msg.hp) || 100;
            existing.maxHp = Number(msg.maxHp) || 100;
            existing.emote = msg.emote ?? null;
            existing.emoteTime = Number(msg.emoteTime) || 0;
            existing.lastSeen = Date.now();
          }
          return;
        }

        if (msg.type === 'player:special' && boundUid) {
          broadcast(
            {
              type: 'player:special',
              uid: boundUid,
              characterId: msg.characterId,
              x: Number(msg.x) || 0,
              y: Number(msg.y) || 0,
            },
            ws
          );
          return;
        }

        if (msg.type === 'player:shoot' && boundUid) {
          broadcast(
            {
              type: 'player:shoot',
              uid: boundUid,
              weaponId: msg.weaponId || 'pistol',
              x: Number(msg.x) || 0,
              y: Number(msg.y) || 0,
              angle: Number(msg.angle) || 0,
            },
            ws
          );
          return;
        }

        if (msg.type === 'player:pvp_hit' && boundUid) {
          const targetUid = String(msg.targetUid || '').trim().toUpperCase();
          const dmg = Math.max(5, Math.min(60, Number(msg.damage) || 20));
          const attacker = livePlayers.get(boundUid);
          if (targetUid && targetUid !== boundUid) {
            broadcast(
              {
                type: 'player:pvp_hit',
                attackerUid: boundUid,
                attackerName: attacker?.name || boundUid,
                targetUid,
                damage: dmg,
              },
              ws
            );
          }
          return;
        }

        if (msg.type === 'player:horn' && boundUid) {
          broadcast(
            {
              type: 'player:horn',
              uid: boundUid,
              hornType: msg.hornType || 'auto_peepoo',
              x: Number(msg.x) || 0,
              y: Number(msg.y) || 0,
            },
            ws
          );
          return;
        }

        if (msg.type === 'chat:send' && boundUid) {
          const text = String(msg.text || '').trim().slice(0, 140);
          if (!text) return;
          const msgId = String(msg.id || `chat-${boundUid}-${Date.now()}`);
          if (chatHistory.some((c) => c.id === msgId)) return; // Idempotency guard
          const p = livePlayers.get(boundUid);
          const chatMsg: ChatMessage = {
            id: msgId,
            uid: boundUid,
            name: p?.name || String(msg.name || boundUid).slice(0, 18),
            characterId: p?.characterId || msg.characterId || 'motu',
            text,
            timestamp: Date.now(),
          };
          chatHistory.push(chatMsg);
          if (chatHistory.length > 60) chatHistory.shift();
          broadcast({ type: 'chat:message', message: chatMsg });
          return;
        }

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', t: msg.t }));
        }
      } catch {
        // Ignore malformed packets safely
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      if (boundUid) {
        // Only remove player if no other socket holds this UID
        let stillConnected = false;
        for (const c of clients.values()) {
          if (c.uid === boundUid) {
            stillConnected = true;
            break;
          }
        }
        if (!stillConnected) {
          livePlayers.delete(boundUid);
          broadcast({ type: 'player:left', uid: boundUid, onlineCount: livePlayers.size });
        }
      }
    });
  });

  // 20Hz authoritative low-latency world state broadcast tick
  setInterval(() => {
    if (clients.size === 0) return;
    const now = Date.now();
    // Prune stale ghost sessions > 30s
    for (const [uid, p] of livePlayers) {
      if (now - p.lastSeen > 30000) {
        livePlayers.delete(uid);
      }
    }
    const snapshot = JSON.stringify({
      type: 'world:snapshot',
      t: now,
      onlineCount: livePlayers.size,
      players: Array.from(livePlayers.values()),
    });
    for (const [ws] of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(snapshot);
      }
    }
  }, 50);

  // Vite dev middleware or Production static + lightweight SSR hydration
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/ws')) {
        next();
        return;
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        const ssrScript = `<script>window.__INITIAL_WORLD_STATE__=${JSON.stringify(getInitialWorldPayload())};</script>`;
        const html = template.replace('</head>', `${ssrScript}</head>`);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.use('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        const template = fs.readFileSync(indexPath, 'utf-8');
        const ssrScript = `<script>window.__INITIAL_WORLD_STATE__=${JSON.stringify(getInitialWorldPayload())};</script>`;
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template.replace('</head>', `${ssrScript}</head>`));
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Furfuri Grand Auto server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
