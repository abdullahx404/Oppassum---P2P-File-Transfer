# Oppassum

Oppassum is a browser-based peer-to-peer file transfer app for sending files and folders directly between nearby devices. It works without accounts, cloud storage, compression, or quality loss.

The app uses a signaling service only to help browsers discover and negotiate a connection. File data moves directly between devices through WebRTC DataChannel whenever the browser and network allow it.

## What It Does

- Discovers devices in the same local network scope.
- Sends files directly between browsers.
- Supports folder transfer as a ZIP or as separate files.
- Shows transfer progress, sent files, received files, and download actions.
- Includes receiver approval before transfer starts.
- Supports light and dark themes.
- Avoids permanent storage of transferred files.

## Tech Stack

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS 4
- Signaling server: Node.js 22, Express, Socket.io
- Peer transfer: WebRTC DataChannel
- Shared validation: Zod
- Analytics: Vercel Analytics
- Testing: Vitest, Testing Library, Playwright
- Frontend hosting: Vercel
- Signaling hosting: Render

## Releases

- v1.0.0: Initial project setup, workspace structure, signaling foundation, and baseline testing.
- v1.0.1: Frontend theme, responsive UI, file selection, folder selection, and transfer controls.
- v1.1.0: WebRTC transfer flow, chunked transfer handling, progress states, and receiver approval.
- v2.0.0: Security tightening with local network scoped discovery and safer room handling.
- v2.1.0: Dark theme, branded info panel, improved controls, and final UI polish.

## Documents

- [Architecture](Architecture.md)
- [SRS](SRS.md)
