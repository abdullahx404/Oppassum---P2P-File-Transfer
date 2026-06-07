import type { SignalMessage } from "@oppassum/shared";

const DEFAULT_STUN_URL = "stun:stun.l.google.com:19302";

export type PeerConnectionRole = "initiator" | "receiver";

export type PeerConnectionCallbacks = {
  onLocalSignal: (message: Omit<SignalMessage, "roomId" | "fromPeerId" | "toPeerId">) => void;
  onDataChannelOpen: () => void;
  onDataChannelMessage?: (message: string | ArrayBuffer) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
};

export function createPeerConnection(callbacks: PeerConnectionCallbacks): RTCPeerConnection {
  const connection = new RTCPeerConnection({
    iceServers: [
      {
        urls: process.env.NEXT_PUBLIC_STUN_URL ?? DEFAULT_STUN_URL
      }
    ]
  });

  connection.onicecandidate = (event) => {
    if (!event.candidate) {
      return;
    }

    callbacks.onLocalSignal({
      type: "ice-candidate",
      payload: event.candidate.toJSON()
    });
  };

  connection.onconnectionstatechange = () => {
    callbacks.onConnectionStateChange(connection.connectionState);
  };

  return connection;
}

export function attachDataChannelHandlers(
  channel: RTCDataChannel,
  onOpen: () => void,
  onMessage?: (message: string | ArrayBuffer) => void
): RTCDataChannel {
  channel.binaryType = "arraybuffer";
  channel.onopen = () => {
    channel.send("oppassum:probe");
    onOpen();
  };
  channel.onmessage = (event) => {
    if (typeof event.data === "string") {
      onMessage?.(event.data);
    }

    if (event.data instanceof ArrayBuffer) {
      onMessage?.(event.data);
    }
  };

  return channel;
}

export async function createOffer(connection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const offer = await connection.createOffer();
  await connection.setLocalDescription(offer);
  return offer;
}

export async function createAnswer(connection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const answer = await connection.createAnswer();
  await connection.setLocalDescription(answer);
  return answer;
}
