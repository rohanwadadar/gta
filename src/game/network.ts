import {
  ChatMessage,
  CommunityMission,
  INITIAL_OFFICIAL_MISSIONS,
  PlayerProfile,
  RemotePlayerState,
  createDefaultProfile,
} from '../shared/types';

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

interface OfflineQueueItem {
  id: string;
  kind: 'profile_sync' | 'create_mission' | 'upvote_mission' | 'complete_mission';
  payload: unknown;
  createdAt: number;
}

const LAST_UID_KEY = 'fga_last_uid';
const MISSIONS_CACHE_KEY = 'fga_missions_cache';
const QUEUE_KEY = 'fga_offline_queue';

function profileKey(uid: string): string {
  return `fga_profile_${uid.toUpperCase()}`;
}

export function getOrCreateLocalUid(): string {
  try {
    const existing = localStorage.getItem(LAST_UID_KEY);
    if (existing && existing.trim().length >= 3) return existing.trim().toUpperCase();
    const generated = `IND-${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem(LAST_UID_KEY, generated);
    return generated;
  } catch {
    return `IND-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

export function saveLastUid(uid: string): void {
  try {
    localStorage.setItem(LAST_UID_KEY, uid.trim().toUpperCase());
  } catch {
    // Ignore storage quota errors
  }
}

export function loadLocalProfile(uid: string): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(profileKey(uid));
    if (!raw) return null;
    return JSON.parse(raw) as PlayerProfile;
  } catch {
    return null;
  }
}

export function saveLocalProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(profileKey(profile.uid), JSON.stringify(profile));
    localStorage.setItem(LAST_UID_KEY, profile.uid);
  } catch {
    // Ignore storage quota errors
  }
}

export function loadCachedMissions(): CommunityMission[] {
  try {
    // Prefer SSR hydrated payload on first boot if available
    const ssr = (window as unknown as { __INITIAL_WORLD_STATE__?: { missions?: CommunityMission[] } })
      .__INITIAL_WORLD_STATE__;
    const raw = localStorage.getItem(MISSIONS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CommunityMission[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    if (ssr?.missions && ssr.missions.length > 0) return ssr.missions;
  } catch {
    // fallback
  }
  return [...INITIAL_OFFICIAL_MISSIONS];
}

export function saveCachedMissions(missions: CommunityMission[]): void {
  try {
    localStorage.setItem(MISSIONS_CACHE_KEY, JSON.stringify(missions));
  } catch {
    // Ignore
  }
}

function loadQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(q: OfflineQueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // Ignore
  }
}

export interface NetworkCallbacks {
  onStatusChange: (status: ConnectionStatus, pingMs: number, onlineCount: number) => void;
  onRemotePlayersSnapshot: (players: RemotePlayerState[]) => void;
  onRemoteSpecial: (evt: { uid: string; characterId: string; x: number; y: number }) => void;
  onRemoteShoot: (evt: { uid: string; weaponId: string; x: number; y: number; angle: number }) => void;
  onPvpHit: (evt: { attackerUid: string; attackerName: string; targetUid: string; damage: number }) => void;
  onRemoteHorn: (evt: { uid: string; hornType: string; x: number; y: number }) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onChatHistory: (msgs: ChatMessage[]) => void;
  onMissionsUpdate: (missions: CommunityMission[]) => void;
  onMissionUpsert: (mission: CommunityMission) => void;
  onOfflineSyncNotice: (message: string) => void;
}

export class GameNetworkClient {
  private ws: WebSocket | null = null;
  private uid = '';
  private profile: PlayerProfile | null = null;
  private status: ConnectionStatus = 'offline';
  private forceOffline = false;
  private reconnectTimer: number | null = null;
  private reconnectDelay = 1500;
  private pingInterval: number | null = null;
  private pingMs = 0;
  private onlineCount = 1;
  private callbacks: NetworkCallbacks;
  private destroyed = false;

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleBrowserOnline);
      window.addEventListener('offline', this.handleBrowserOffline);
    }
  }

  private handleBrowserOnline = () => {
    if (!this.forceOffline && this.uid) {
      this.connectWebSocket();
      this.flushOfflineQueue();
    }
  };

  private handleBrowserOffline = () => {
    this.setStatus('offline');
  };

  private setStatus(next: ConnectionStatus): void {
    this.status = next;
    this.callbacks.onStatusChange(next, this.pingMs, this.onlineCount);
  }

  public isOffline(): boolean {
    return this.status !== 'online';
  }

  public setForceOffline(offline: boolean): void {
    this.forceOffline = offline;
    if (offline) {
      this.closeSocket();
      this.setStatus('offline');
      this.callbacks.onOfflineSyncNotice('Offline Solo Mode enabled — progress saves locally.');
    } else {
      this.reconnectDelay = 1500;
      this.connectWebSocket();
      this.flushOfflineQueue();
    }
  }

  public async bootstrapAndConnect(
    uid: string,
    preferredName: string,
    preferredChar: PlayerProfile['characterId'],
    offlineMode: boolean
  ): Promise<{ profile: PlayerProfile; missions: CommunityMission[] }> {
    const cleanUid = uid.trim().toUpperCase().slice(0, 16) || getOrCreateLocalUid();
    this.uid = cleanUid;
    this.forceOffline = offlineMode;
    saveLastUid(cleanUid);

    const local = loadLocalProfile(cleanUid);
    const cachedMissions = loadCachedMissions();

    // Create baseline local profile immediately so zero latency even if offline
    let activeProfile: PlayerProfile = local
      ? {
          ...local,
          name: preferredName.trim() || local.name,
          characterId: preferredChar,
          updatedAt: Date.now(),
        }
      : createDefaultProfile(cleanUid, preferredName, preferredChar);

    saveLocalProfile(activeProfile);
    this.profile = activeProfile;

    if (offlineMode || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      this.setStatus('offline');
      return { profile: activeProfile, missions: cachedMissions };
    }

    // Attempt server bootstrap & merge
    try {
      const res = await fetch(`/api/bootstrap?uid=${encodeURIComponent(cleanUid)}`);
      if (res.ok) {
        const data = await res.json();
        const serverProf = data.profile as PlayerProfile;
        // Merge safely keeping highest progress + user's freshly chosen character/name
        activeProfile = {
          ...serverProf,
          name: preferredName.trim() || serverProf.name,
          characterId: preferredChar,
          rupees: Math.max(serverProf.rupees, activeProfile.rupees),
          xp: Math.max(serverProf.xp, activeProfile.xp),
          level: Math.max(serverProf.level, activeProfile.level),
          ownedVehicles: Array.from(new Set([...serverProf.ownedVehicles, ...activeProfile.ownedVehicles])),
          completedMissionIds: Array.from(
            new Set([...serverProf.completedMissionIds, ...activeProfile.completedMissionIds])
          ),
          garageConfigs: { ...serverProf.garageConfigs, ...activeProfile.garageConfigs },
          updatedAt: Date.now(),
        };
        this.profile = activeProfile;
        saveLocalProfile(activeProfile);

        if (Array.isArray(data.missions)) {
          saveCachedMissions(data.missions);
        }
        if (Array.isArray(data.chatHistory)) {
          this.callbacks.onChatHistory(data.chatHistory);
        }
        this.onlineCount = Math.max(1, Number(data.onlineCount) || 1);

        // Push merged profile back to server
        this.syncProfile(activeProfile);
        this.connectWebSocket();
        this.flushOfflineQueue();

        return {
          profile: activeProfile,
          missions: Array.isArray(data.missions) ? data.missions : cachedMissions,
        };
      }
    } catch {
      // Seamless fallback to offline mode
    }

    this.setStatus('offline');
    if (!this.forceOffline) {
      this.scheduleReconnect();
    }
    return { profile: activeProfile, missions: cachedMissions };
  }

  private connectWebSocket(): void {
    if (this.destroyed || this.forceOffline || !this.uid) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        if (this.destroyed) {
          ws.close();
          return;
        }
        this.reconnectDelay = 1500;
        this.setStatus('online');
        ws.send(
          JSON.stringify({
            type: 'player:join',
            uid: this.uid,
            name: this.profile?.name || this.uid,
            characterId: this.profile?.characterId || 'motu',
            x: 2800,
            y: 2980,
          })
        );
        this.flushOfflineQueue();
        this.startPing();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'world:init') {
            this.onlineCount = Math.max(1, Number(msg.onlineCount) || 1);
            this.callbacks.onStatusChange('online', this.pingMs, this.onlineCount);
            if (Array.isArray(msg.players)) {
              this.callbacks.onRemotePlayersSnapshot(msg.players);
            }
            if (Array.isArray(msg.chatHistory)) {
              this.callbacks.onChatHistory(msg.chatHistory);
            }
            if (Array.isArray(msg.missions)) {
              saveCachedMissions(msg.missions);
              this.callbacks.onMissionsUpdate(msg.missions);
            }
          } else if (msg.type === 'world:snapshot') {
            this.onlineCount = Math.max(1, Number(msg.onlineCount) || 1);
            if (Array.isArray(msg.players)) {
              this.callbacks.onRemotePlayersSnapshot(msg.players);
            }
          } else if (msg.type === 'player:special') {
            this.callbacks.onRemoteSpecial(msg);
          } else if (msg.type === 'player:shoot') {
            this.callbacks.onRemoteShoot(msg);
          } else if (msg.type === 'player:pvp_hit') {
            this.callbacks.onPvpHit(msg);
          } else if (msg.type === 'player:horn') {
            this.callbacks.onRemoteHorn(msg);
          } else if (msg.type === 'chat:message' && msg.message) {
            this.callbacks.onChatMessage(msg.message);
          } else if ((msg.type === 'mission:created' || msg.type === 'mission:updated') && msg.mission) {
            this.callbacks.onMissionUpsert(msg.mission);
          } else if (msg.type === 'pong' && typeof msg.t === 'number') {
            this.pingMs = Math.max(1, Math.round(Date.now() - msg.t));
            this.callbacks.onStatusChange('online', this.pingMs, this.onlineCount);
          }
        } catch {
          // Ignore malformed server payload
        }
      };

      ws.onclose = () => {
        this.stopPing();
        this.ws = null;
        if (!this.destroyed) {
          this.setStatus('offline');
          if (!this.forceOffline) {
            this.scheduleReconnect();
          }
        }
      };

      ws.onerror = () => {
        // onclose handles cleanup and reconnect
      };
    } catch {
      this.setStatus('offline');
      if (!this.forceOffline) this.scheduleReconnect();
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
      }
    }, 5000);
  }

  private stopPing(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null || this.forceOffline || this.destroyed) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(8000, Math.round(this.reconnectDelay * 1.6));
      this.connectWebSocket();
    }, this.reconnectDelay);
  }

  private closeSocket(): void {
    this.stopPing();
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
  }

  public sendPlayerState(state: Omit<RemotePlayerState, 'uid' | 'lastSeen'>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'player:state', ...state }));
    }
  }

  public sendSpecialEvent(characterId: string, x: number, y: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'player:special', characterId, x, y }));
    }
  }

  public sendShootEvent(weaponId: string, x: number, y: number, angle: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'player:shoot', weaponId, x, y, angle }));
    }
  }

  public sendPvpHitEvent(targetUid: string, damage: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'player:pvp_hit', targetUid, damage }));
    }
  }

  public sendHornEvent(hornType: string, x: number, y: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'player:horn', hornType, x, y }));
    }
  }

  public sendChat(text: string, profile: PlayerProfile): void {
    const clean = text.trim().slice(0, 140);
    if (!clean) return;
    const msgId = `chat-${profile.uid}-${Date.now()}-${Math.floor(Math.random() * 999)}`;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'chat:send',
          id: msgId,
          text: clean,
          name: profile.name,
          characterId: profile.characterId,
        })
      );
    } else {
      // Echo locally in offline mode so user gets clear feedback
      this.callbacks.onChatMessage({
        id: msgId,
        uid: profile.uid,
        name: `${profile.name} (Offline)`,
        characterId: profile.characterId,
        text: clean,
        timestamp: Date.now(),
      });
    }
  }

  public async syncProfile(profile: PlayerProfile): Promise<void> {
    this.profile = profile;
    saveLocalProfile(profile);

    if (this.forceOffline || this.status === 'offline') {
      this.enqueue({
        id: `sync-${profile.uid}`,
        kind: 'profile_sync',
        payload: profile,
        createdAt: Date.now(),
      });
      return;
    }

    try {
      const res = await fetch('/api/profile/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Sync failed');
    } catch {
      this.enqueue({
        id: `sync-${profile.uid}`,
        kind: 'profile_sync',
        payload: profile,
        createdAt: Date.now(),
      });
    }
  }

  public async publishMission(mission: CommunityMission): Promise<CommunityMission> {
    // Always add optimistically to local cache
    const cached = loadCachedMissions();
    if (!cached.some((m) => m.id === mission.id)) {
      saveCachedMissions([mission, ...cached]);
    }
    this.callbacks.onMissionUpsert(mission);

    if (this.forceOffline || this.status === 'offline') {
      this.enqueue({
        id: `cmis-${mission.id}`,
        kind: 'create_mission',
        payload: mission,
        createdAt: Date.now(),
      });
      this.callbacks.onOfflineSyncNotice('Mission saved locally — will publish to server when online.');
      return mission;
    }

    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mission),
      });
      if (res.ok) {
        const data = await res.json();
        return (data.mission as CommunityMission) || mission;
      }
      throw new Error('Failed');
    } catch {
      this.enqueue({
        id: `cmis-${mission.id}`,
        kind: 'create_mission',
        payload: mission,
        createdAt: Date.now(),
      });
      this.callbacks.onOfflineSyncNotice('Connection dropped — mission queued for auto-sync.');
      return mission;
    }
  }

  public async upvoteMission(missionId: string): Promise<void> {
    if (this.forceOffline || this.status === 'offline') {
      this.enqueue({
        id: `up-${missionId}-${Date.now()}`,
        kind: 'upvote_mission',
        payload: { missionId },
        createdAt: Date.now(),
      });
      return;
    }
    try {
      await fetch(`/api/missions/${encodeURIComponent(missionId)}/upvote`, { method: 'POST' });
    } catch {
      this.enqueue({
        id: `up-${missionId}-${Date.now()}`,
        kind: 'upvote_mission',
        payload: { missionId },
        createdAt: Date.now(),
      });
    }
  }

  public async recordMissionComplete(missionId: string): Promise<void> {
    if (this.forceOffline || this.status === 'offline') {
      this.enqueue({
        id: `comp-${missionId}-${Date.now()}`,
        kind: 'complete_mission',
        payload: { missionId },
        createdAt: Date.now(),
      });
      return;
    }
    try {
      await fetch(`/api/missions/${encodeURIComponent(missionId)}/complete`, { method: 'POST' });
    } catch {
      this.enqueue({
        id: `comp-${missionId}-${Date.now()}`,
        kind: 'complete_mission',
        payload: { missionId },
        createdAt: Date.now(),
      });
    }
  }

  private enqueue(item: OfflineQueueItem): void {
    const q = loadQueue();
    // Deduplicate profile_sync so queue stays lean
    const filtered = item.kind === 'profile_sync' ? q.filter((x) => x.id !== item.id) : q;
    filtered.push(item);
    saveQueue(filtered);
  }

  public async flushOfflineQueue(): Promise<void> {
    if (this.forceOffline) return;
    const q = loadQueue();
    if (q.length === 0) return;

    const remaining: OfflineQueueItem[] = [];
    let syncedCount = 0;

    for (const item of q) {
      try {
        if (item.kind === 'profile_sync') {
          const res = await fetch('/api/profile/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });
          if (!res.ok) throw new Error('fail');
          syncedCount++;
        } else if (item.kind === 'create_mission') {
          const res = await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });
          if (!res.ok) throw new Error('fail');
          syncedCount++;
        } else if (item.kind === 'upvote_mission') {
          const { missionId } = item.payload as { missionId: string };
          const res = await fetch(`/api/missions/${encodeURIComponent(missionId)}/upvote`, { method: 'POST' });
          if (!res.ok) throw new Error('fail');
          syncedCount++;
        } else if (item.kind === 'complete_mission') {
          const { missionId } = item.payload as { missionId: string };
          const res = await fetch(`/api/missions/${encodeURIComponent(missionId)}/complete`, { method: 'POST' });
          if (!res.ok) throw new Error('fail');
          syncedCount++;
        }
      } catch {
        remaining.push(item);
      }
    }

    saveQueue(remaining);
    if (syncedCount > 0) {
      this.callbacks.onOfflineSyncNotice(`Synced ${syncedCount} offline save${syncedCount > 1 ? 's' : ''} to server.`);
    }
  }

  public destroy(): void {
    this.destroyed = true;
    this.closeSocket();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleBrowserOnline);
      window.removeEventListener('offline', this.handleBrowserOffline);
    }
  }
}
