# Software Requirements Specification

## Product Name

Oppassum

## Purpose

Oppassum provides quick browser-to-browser file transfer between nearby devices without accounts, compression, permanent cloud storage, or quality loss.

## Scope

The system supports file and folder sharing between devices using a web interface. A signaling server helps devices discover and negotiate a peer connection, while WebRTC DataChannel handles direct data transfer.

## Users

- A sender who selects files or folders.
- A receiver who approves the transfer and downloads the received files.

## Functional Requirements

- The app shall allow users to open the website without login.
- The app shall display discoverable devices in the same local-network scope.
- The app shall allow file selection through a file picker.
- The app shall allow folder selection.
- The app shall allow folders to be sent as a ZIP or as separate files.
- The app shall require a receiver approval before sending file chunks.
- The app shall transfer files through WebRTC DataChannel.
- The app shall split large files into chunks.
- The app shall show transfer progress.
- The app shall show sent and received transfer states.
- The app shall provide download buttons for received files.
- The app shall provide a download-all action when multiple files are received.
- The app shall allow users to rename their visible device name.
- The app shall support light and dark theme modes.
- The app shall show a wake notice if the signaling service is slow to connect.

## Non-Functional Requirements

- File transfer should avoid quality loss and compression unless the user explicitly chooses ZIP for folders.
- The signaling server should not receive or store file contents.
- The UI should work on desktop, tablet, and mobile browsers.
- The transfer flow should remain usable on free hosting infrastructure.
- The app should fail gracefully when WebRTC cannot connect.

## System Requirements

- Frontend: Next.js, React, TypeScript, Tailwind CSS.
- Backend signaling: Node.js, Express, Socket.io.
- Transfer channel: WebRTC DataChannel.
- Shared validation: Zod.
- Hosting: Vercel for frontend and Render for signaling.

## Constraints

- Both devices must remain awake and keep the website open during transfer.
- STUN-only WebRTC may fail on restrictive networks.
- TURN may be required later for wider network compatibility.
- No cloud storage means the receiver must be online during transfer.
- Browser memory can limit very large transfers.

## Acceptance Criteria

- Two devices in the same allowed discovery scope can see each other.
- A sender can select a file and send it to a receiver.
- The receiver sees an approval prompt.
- Accepted transfers complete and produce downloadable files.
- Rejected transfers stop cleanly.
- The app passes typecheck, lint, unit tests, and production build.
