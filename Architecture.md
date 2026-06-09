# Oppassum Architecture

## Overview

Oppassum is split into three workspace areas: the web app, the signaling server, and a shared package. The web app handles the user interface and browser-to-browser transfer logic. The signaling server coordinates discovery and WebRTC negotiation. The shared package keeps validation schemas and cross-app types consistent.

## Components

### Web App

The web app is built with Next.js, React, TypeScript, and Tailwind CSS. It handles device identity, file and folder selection, receiver approval, WebRTC peer connection setup, chunked file transfer, progress display, downloads, theme switching, and Vercel Analytics.

### Signaling Server

The signaling server is built with Node.js, Express, and Socket.io. It manages temporary room membership, connected peer lists, WebRTC offers, answers, ICE candidates, basic rate limiting, and health checks.

The signaling server does not store transferred files.

### Shared Package

The shared package contains Zod schemas and TypeScript types used by both the web app and signaling server. It keeps socket payloads and transfer metadata aligned between browser and server.

## Transfer Flow

1. A browser opens Oppassum and connects to the signaling server.
2. The signaling server places the device into a local-network scoped room.
3. Devices in the same room receive each other's temporary peer metadata.
4. The sender selects files or a folder.
5. The sender chooses a receiving device.
6. WebRTC negotiation happens through Socket.io signaling.
7. The receiver accepts or rejects the transfer request.
8. If accepted, files move through WebRTC DataChannel in chunks.
9. The receiver reconstructs the files in browser memory and exposes download actions.

## Security Model

- No login is required.
- Discovery is scoped to a local-network room instead of a global public room.
- Files do not pass through the signaling server.
- The receiver must approve a transfer before file chunks are accepted.
- No persistent cloud storage is used for transfer data.
- Device names and peer identifiers are temporary browser-side metadata.

## Deployment

- The frontend runs on Vercel.
- The signaling server runs on Render.
- Browser transfer uses WebRTC DataChannel.
- STUN is used for peer negotiation support.
- TURN can be added later for stricter networks where direct peer connectivity fails.
