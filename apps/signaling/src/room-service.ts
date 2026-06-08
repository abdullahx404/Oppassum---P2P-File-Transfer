import type { Peer } from "@oppassum/shared";

type PeerSession = {
  peer: Peer;
  socketId: string;
};

type Room = {
  id: string;
  peers: Map<string, PeerSession>;
};

export class RoomService {
  private readonly rooms = new Map<string, Room>();
  private readonly socketRooms = new Map<string, string>();
  private readonly socketPeers = new Map<string, string>();

  joinRoom(roomId: string, socketId: string, peer: Peer): { peers: Peer[]; replacedPeerId?: string } {
    this.leaveBySocket(socketId);

    const room = this.ensureRoom(roomId);
    const existingSession = room.peers.get(peer.peerId);

    if (existingSession && existingSession.socketId !== socketId) {
      this.socketRooms.delete(existingSession.socketId);
      this.socketPeers.delete(existingSession.socketId);
    }

    room.peers.set(peer.peerId, { peer, socketId });
    this.socketRooms.set(socketId, roomId);
    this.socketPeers.set(socketId, peer.peerId);

    return {
      peers: this.listPeers(roomId),
      replacedPeerId:
        existingSession && existingSession.socketId !== socketId ? existingSession.peer.peerId : undefined
    };
  }

  leaveBySocket(socketId: string): { roomId: string; peerId: string } | undefined {
    const roomId = this.socketRooms.get(socketId);
    const peerId = this.socketPeers.get(socketId);

    if (!roomId || !peerId) {
      return undefined;
    }

    const room = this.rooms.get(roomId);
    const activeSession = room?.peers.get(peerId);

    if (activeSession?.socketId === socketId) {
      room?.peers.delete(peerId);
    }

    if (room && room.peers.size === 0) {
      this.rooms.delete(roomId);
    }

    this.socketRooms.delete(socketId);
    this.socketPeers.delete(socketId);

    return { roomId, peerId };
  }

  listPeers(roomId: string): Peer[] {
    return Array.from(this.rooms.get(roomId)?.peers.values() ?? []).map((session) => session.peer);
  }

  getSocketRoom(socketId: string): string | undefined {
    return this.socketRooms.get(socketId);
  }

  getSocketPeerId(socketId: string): string | undefined {
    return this.socketPeers.get(socketId);
  }

  getPeerSocketId(roomId: string, peerId: string): string | undefined {
    return this.rooms.get(roomId)?.peers.get(peerId)?.socketId;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getPeerCount(roomId: string): number {
    return this.rooms.get(roomId)?.peers.size ?? 0;
  }

  private ensureRoom(roomId: string): Room {
    const existingRoom = this.rooms.get(roomId);

    if (existingRoom) {
      return existingRoom;
    }

    const room: Room = {
      id: roomId,
      peers: new Map()
    };

    this.rooms.set(roomId, room);
    return room;
  }
}
