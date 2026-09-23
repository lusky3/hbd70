// src/systems/NetworkManager.js
// PeerJS WebRTC P2P DataChannel networking manager for Allan's 70th Birthday Arcade
// Implements Host-Authoritative Star Topology, room code generation, and heartbeat

import { censorText } from '../utils/ProfanityFilter.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes 0, O, 1, I
const PEER_PREFIX = 'hbd70-room-';
const HEARTBEAT_INTERVAL = 2000;
const TIMEOUT_INTERVAL = 8000;

export class NetworkManager {
  constructor() {
    this.peer = null;
    this.isHost = false;
    this.roomCode = null;
    this.mySlot = 1; // 1 = Host, 2-4 = Clients
    this.myProfile = { tag: 'ALL', fullName: 'Allan' };
    this.connections = new Map(); // connId / slot => DataConnection
    this.players = new Map(); // slot => { slot, id, tag, fullName, ping, ready }
    this.gameMode = 'tanks'; // 'tanks' | 'pong'
    this.listeners = new Map();
    this.heartbeatTimer = null;
    this.lastReceivedTime = new Map(); // slot => timestamp
    this.clientInputs = new Map(); // slot => latest input packet
    this.wasKicked = false;
  }

  // --- Event Emitter ---
  on(event, fn) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(fn);
    }
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(fn => {
        try {
          fn(...args);
        } catch (e) {
          console.error(`[NetworkManager] Error in listener for ${event}:`, e);
        }
      });
    }
  }

  // --- Room Code Generator ---
  static generateRoomCode(length = 4) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }
    return result;
  }

  static sanitizeRoomCode(code) {
    if (!code) return '';
    return String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }

  // --- Host Room Creation ---
  async createRoom(profile = {}, requestedCode = null) {
    this.disconnect();
    this.wasKicked = false;
    this.isHost = true;
    this.mySlot = 1;
    const hostTag = (profile.tag || 'ALL').toUpperCase().slice(0, 3);
    const hostName = (profile.fullName || profile.name || '').trim();
    this.myProfile = {
      tag: hostTag,
      fullName: (hostName || (hostTag !== 'ALL' ? hostTag : 'Allan')).slice(0, 24)
    };

    this.roomCode = requestedCode ? NetworkManager.sanitizeRoomCode(requestedCode) : NetworkManager.generateRoomCode();
    const peerId = `${PEER_PREFIX}${this.roomCode}`;

    this.players.set(1, {
      slot: 1,
      id: peerId,
      tag: this.myProfile.tag,
      fullName: this.myProfile.fullName,
      ping: 0,
      ready: true,
      isHost: true
    });

    return new Promise((resolve, reject) => {
      const PeerClass = typeof window !== 'undefined' ? window.Peer : null;
      if (!PeerClass) {
        // Fallback for node / offline testing
        console.warn('[NetworkManager] PeerJS not loaded in environment; operating in offline host mode');
        this.emit('room-created', { roomCode: this.roomCode, peerId });
        this.startHeartbeat();
        resolve({ roomCode: this.roomCode, peerId });
        return;
      }

      try {
        this.peer = new PeerClass(peerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          this.emit('room-created', { roomCode: this.roomCode, peerId: id });
          this.startHeartbeat();
          resolve({ roomCode: this.roomCode, peerId: id });
        });

        this.peer.on('connection', (conn) => {
          this.handleHostIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.error('[NetworkManager] PeerJS host error:', err);
          this.emit('error', err);
          if (err.type === 'unavailable-id') {
            // Room code collision; regenerate and retry once
            this.createRoom(profile).then(resolve).catch(reject);
          } else {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // --- Join Room as Client ---
  async joinRoom(roomCode, profile = {}) {
    this.disconnect();
    this.wasKicked = false;
    this.isHost = false;
    this.roomCode = NetworkManager.sanitizeRoomCode(roomCode);
    const clientTag = (profile.tag || 'P2').toUpperCase().slice(0, 3);
    const clientName = (profile.fullName || profile.name || '').trim();
    this.myProfile = {
      tag: clientTag,
      fullName: (clientName || (clientTag !== 'P2' ? clientTag : 'Guest')).slice(0, 24)
    };

    const hostPeerId = `${PEER_PREFIX}${this.roomCode}`;
    const myPeerId = `${PEER_PREFIX}${this.roomCode}-${Math.random().toString(36).substring(2, 8)}`;

    return new Promise((resolve, reject) => {
      const PeerClass = typeof window !== 'undefined' ? window.Peer : null;
      if (!PeerClass) {
        console.warn('[NetworkManager] PeerJS not loaded in environment; cannot join remote room');
        reject(new Error('PeerJS library not loaded'));
        return;
      }

      try {
        this.peer = new PeerClass(myPeerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', () => {
          const conn = this.peer.connect(hostPeerId, {
            reliable: true
          });

          conn.on('open', () => {
            this.hostConn = conn;
            // Send Join Handshake
            conn.send({
              type: 'JOIN_REQ',
              tag: this.myProfile.tag,
              fullName: this.myProfile.fullName
            });
            this.startHeartbeat();
          });

          conn.on('data', (packet) => {
            this.handleClientData(packet, resolve, reject);
          });

          conn.on('close', () => {
            if (!this.wasKicked) {
              this.emit('host-disconnected');
            }
            this.disconnect();
          });

          conn.on('error', (err) => {
            console.error('[NetworkManager] Client connection error:', err);
            this.emit('error', err);
            reject(err);
          });
        });

        this.peer.on('error', (err) => {
          console.error('[NetworkManager] PeerJS client error:', err);
          this.emit('error', err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // --- Host: Handle Incoming Client Connection ---
  handleHostIncomingConnection(conn) {
    conn.on('data', (packet) => {
      if (!packet || typeof packet !== 'object') return;

      if (packet.type === 'JOIN_REQ') {
        // Prevent duplicate JOIN_REQ on same connection
        const existingSlot = this.getSlotByConnection(conn);
        if (existingSlot) {
          conn.send({
            type: 'JOIN_ACK',
            slot: existingSlot,
            roomCode: this.roomCode,
            gameMode: this.gameMode,
            players: Array.from(this.players.values())
          });
          return;
        }

        // Find next open slot between 2 and 4
        let assignedSlot = null;
        for (let s = 2; s <= 4; s++) {
          if (!this.players.has(s)) {
            assignedSlot = s;
            break;
          }
        }

        if (!assignedSlot) {
          conn.send({ type: 'JOIN_REJECT', reason: 'ROOM_FULL' });
          setTimeout(() => conn.close(), 100);
          return;
        }

        const newPlayer = {
          slot: assignedSlot,
          id: conn.peer,
          tag: (packet.tag || `P${assignedSlot}`).toUpperCase().slice(0, 3),
          fullName: (packet.fullName || '').slice(0, 24),
          ping: 0,
          ready: true,
          isHost: false
        };

        this.players.set(assignedSlot, newPlayer);
        this.connections.set(assignedSlot, conn);
        this.lastReceivedTime.set(assignedSlot, Date.now());

        // Send Acceptance ACK
        conn.send({
          type: 'JOIN_ACK',
          slot: assignedSlot,
          roomCode: this.roomCode,
          gameMode: this.gameMode,
          players: Array.from(this.players.values())
        });

        // Broadcast updated lobby roster to all clients
        this.broadcastLobbyState();
        this.emit('player-joined', newPlayer);
        return;
      }

      if (packet.type === 'PLAYER_INPUT') {
        // Authoritatively derive slot from physical WebRTC connection (C-02 defense)
        const verifiedSlot = this.getSlotByConnection(conn);
        if (!verifiedSlot) return; // Drop unverified or spoofed inputs
        packet.slot = verifiedSlot;
        this.clientInputs.set(verifiedSlot, packet);
        this.lastReceivedTime.set(verifiedSlot, Date.now());
        return;
      }

      if (packet.type === 'PING') {
        conn.send({ type: 'PONG', timestamp: packet.timestamp });
        return;
      }

      if (packet.type === 'PONG') {
        const rtt = Date.now() - packet.timestamp;
        const slot = this.getSlotByConnection(conn);
        if (slot && this.players.has(slot)) {
          this.players.get(slot).ping = Math.round(rtt / 2);
          this.lastReceivedTime.set(slot, Date.now());
        }
        return;
      }

      if (packet.type === 'CLIENT_READY') {
        const verifiedSlot = this.getSlotByConnection(conn);
        if (verifiedSlot && this.players.has(verifiedSlot)) {
          this.players.get(verifiedSlot).ready = !!packet.ready;
          this.broadcastLobbyState();
        }
        return;
      }

      if (packet.type === 'LOBBY_CHAT') {
        const verifiedSlot = this.getSlotByConnection(conn);
        if (!verifiedSlot) return;
        const sender = this.players.get(verifiedSlot);
        const rawText = String(packet.text || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 50);
        const chatPacket = {
          type: 'LOBBY_CHAT',
          slot: verifiedSlot,
          tag: sender?.tag || `P${verifiedSlot}`,
          name: sender?.fullName || '',
          text: censorText(rawText),
          timestamp: Date.now()
        };
        this.broadcast(chatPacket);
        this.emit('lobby-chat', chatPacket);
        return;
      }

      // Custom game events (H-01 defense)
      if (packet.type === 'EVENT') {
        const verifiedSlot = this.getSlotByConnection(conn);
        if (!verifiedSlot) return;
        packet.slot = verifiedSlot;

        // Block untrusted client-originated match-over packets
        if (packet.event === 'match-over' || packet.event === 'pong-match-over') {
          console.warn(`[NetworkManager] Blocked untrusted match termination event from client slot ${verifiedSlot}`);
          return;
        }

        this.emit('network-event', packet);
      }
    });

    conn.on('close', () => {
      const slot = this.getSlotByConnection(conn);
      if (slot) {
        const player = this.players.get(slot);
        this.players.delete(slot);
        this.connections.delete(slot);
        this.clientInputs.delete(slot);
        this.broadcastLobbyState();
        this.emit('player-left', { slot, player });
      }
    });
  }

  // --- Client: Handle Received Data from Host ---
  handleClientData(packet, resolveJoin, rejectJoin) {
    if (!packet || typeof packet !== 'object') return;

    if (packet.type === 'JOIN_ACK') {
      this.mySlot = packet.slot;
      this.roomCode = packet.roomCode;
      this.gameMode = packet.gameMode || 'tanks';
      this.players.clear();
      packet.players.forEach(p => this.players.set(p.slot, p));
      this.emit('joined-room', { slot: this.mySlot, roomCode: this.roomCode, players: packet.players });
      if (resolveJoin) resolveJoin(packet);
      return;
    }

    if (packet.type === 'JOIN_REJECT') {
      const err = new Error(packet.reason || 'Failed to join room');
      this.emit('join-rejected', err);
      if (rejectJoin) rejectJoin(err);
      return;
    }

    if (packet.type === 'LOBBY_STATE') {
      this.gameMode = packet.gameMode;
      this.players.clear();
      packet.players.forEach(p => this.players.set(p.slot, p));
      this.emit('lobby-updated', { gameMode: this.gameMode, players: packet.players });
      return;
    }

    if (packet.type === 'GAME_START') {
      this.gameMode = packet.gameMode;
      this.emit('game-start', packet);
      return;
    }

    if (packet.type === 'GAME_SNAPSHOT') {
      this.emit('game-snapshot', packet.snapshot);
      this.emit('state-update', packet.snapshot);
      return;
    }

    if (packet.type === 'PING') {
      if (this.hostConn && this.hostConn.open) {
        this.hostConn.send({ type: 'PONG', timestamp: packet.timestamp });
      }
      return;
    }

    if (packet.type === 'PONG') {
      const rtt = Date.now() - packet.timestamp;
      if (this.players.has(this.mySlot)) {
        this.players.get(this.mySlot).ping = Math.round(rtt / 2);
      }
      return;
    }

    if (packet.type === 'LOBBY_CHAT') {
      this.emit('lobby-chat', packet);
      return;
    }

    if (packet.type === 'KICKED') {
      this.wasKicked = true;
      this.emit('kicked', packet);
      this.disconnect();
      return;
    }

    if (packet.type === 'EVENT') {
      this.emit('network-event', packet);
    }
  }

  // --- Broadcasts & Packet Sending ---
  broadcastLobbyState() {
    if (!this.isHost) return;
    const packet = {
      type: 'LOBBY_STATE',
      gameMode: this.gameMode,
      players: Array.from(this.players.values())
    };
    this.broadcast(packet);
    this.emit('lobby-updated', { gameMode: this.gameMode, players: packet.players });
  }

  setGameMode(mode) {
    if (!this.isHost) return;
    this.gameMode = mode;
    this.broadcastLobbyState();
  }

  startGame(data = {}) {
    if (!this.isHost) return;
    const packet = {
      type: 'GAME_START',
      gameMode: this.gameMode,
      seed: Math.floor(Math.random() * 100000),
      players: Array.from(this.players.values()),
      ...data
    };
    this.broadcast(packet);
    this.emit('game-start', packet);
  }

  kickPlayer(slot, reason = 'Removed by host') {
    if (!this.isHost || slot <= 1) return;
    const conn = this.connections.get(slot);
    const player = this.players.get(slot);
    if (conn) {
      try {
        conn.send({ type: 'KICKED', reason });
      } catch {}
      setTimeout(() => {
        try { conn.close(); } catch {}
        this.players.delete(slot);
        this.connections.delete(slot);
        this.clientInputs.delete(slot);
        this.lastReceivedTime.delete(slot);
        this.broadcastLobbyState();
        this.emit('player-left', { slot, player });
      }, 50);
    } else {
      this.players.delete(slot);
      this.connections.delete(slot);
      this.clientInputs.delete(slot);
      this.lastReceivedTime.delete(slot);
      this.broadcastLobbyState();
      this.emit('player-left', { slot, player });
    }
  }

  sendChat(text) {
    let cleanText = (typeof text === 'string' ? text.replace(/[\r\n\t]+/g, ' ').trim() : '').slice(0, 50);
    if (!cleanText) return;
    cleanText = censorText(cleanText);
    const packet = {
      type: 'LOBBY_CHAT',
      slot: this.mySlot,
      tag: this.myProfile?.tag || (this.isHost ? 'HOST' : `P${this.mySlot}`),
      name: this.myProfile?.fullName || '',
      text: cleanText,
      timestamp: Date.now()
    };
    if (this.isHost) {
      this.broadcast(packet);
      this.emit('lobby-chat', packet);
    } else if (this.hostConn && this.hostConn.open) {
      this.hostConn.send(packet);
    }
  }

  broadcastSnapshot(snapshot) {
    if (!this.isHost) return;
    this.broadcast({
      type: 'GAME_SNAPSHOT',
      snapshot
    });
  }

  // AC-1 specification alias
  broadcastState(state) {
    this.broadcastSnapshot(state);
  }

  sendInput(input) {
    if (this.isHost) {
      this.clientInputs.set(1, { ...input, slot: 1 });
      return;
    }
    if (this.hostConn && this.hostConn.open) {
      this.hostConn.send({
        type: 'PLAYER_INPUT',
        slot: this.mySlot,
        ...input
      });
    }
  }

  sendEvent(event, data = {}) {
    const packet = { type: 'EVENT', event, data, slot: this.mySlot };
    if (this.isHost) {
      this.broadcast(packet);
      this.emit('network-event', packet);
    } else if (this.hostConn && this.hostConn.open) {
      this.hostConn.send(packet);
    }
  }

  broadcast(packet) {
    for (const conn of this.connections.values()) {
      if (conn && conn.open) {
        conn.send(packet);
      }
    }
  }

  // --- Heartbeat & Health Checks ---
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      if (this.isHost) {
        // Ping all connected clients
        for (const [slot, conn] of this.connections.entries()) {
          if (conn && conn.open) {
            conn.send({ type: 'PING', timestamp: now });
          }
          // Timeout check
          const lastTime = this.lastReceivedTime.get(slot) || now;
          if (now - lastTime > TIMEOUT_INTERVAL) {
            console.warn(`[NetworkManager] Client in slot ${slot} timed out`);
            conn.close();
          }
        }
      } else if (this.hostConn && this.hostConn.open) {
        this.hostConn.send({ type: 'PING', timestamp: now });
      }
    }, HEARTBEAT_INTERVAL);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  getSlotByConnection(conn) {
    for (const [slot, c] of this.connections.entries()) {
      if (c === conn || c.peer === conn.peer) return slot;
    }
    return null;
  }

  getPlayer(slot) {
    return this.players.get(slot) || null;
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.connections) {
      for (const conn of this.connections.values()) {
        try { conn.close(); } catch (_) {}
      }
      this.connections.clear();
    }
    if (this.hostConn) {
      try { this.hostConn.close(); } catch (_) {}
      this.hostConn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (_) {}
      this.peer = null;
    }
    this.players.clear();
    this.clientInputs.clear();
    this.lastReceivedTime.clear();
    this.isHost = false;
    this.roomCode = null;
    this.mySlot = 1;
  }
}

// Global Singleton
export const network = new NetworkManager();
