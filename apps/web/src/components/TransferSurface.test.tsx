import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { TransferDialog } from "./TransferDialog";
import { TransferSurface, previewRoomState } from "./TransferSurface";
import { createFallbackRoomState } from "../hooks/useSocketRoom";

describe("TransferSurface", () => {
  it("renders the required static upload shell", () => {
    render(React.createElement(TransferSurface, { roomState: previewRoomState }));

    expect(screen.getByLabelText("Oppassum home")).toBeInTheDocument();
    expect(screen.getByLabelText("Information")).toBeInTheDocument();
    expect(screen.getByLabelText("Choose files")).toBeInTheDocument();
    expect(screen.getByLabelText("Choose folder")).toBeInTheDocument();
    expect(screen.getByText("Upload Files")).toBeInTheDocument();
    expect(screen.getByText("Upload Folder")).toBeInTheDocument();
  });

  it("shows mock peers and transfer states for Phase 2", () => {
    render(React.createElement(TransferSurface, { roomState: previewRoomState }));

    expect(screen.getByRole("button", { name: "Studio Laptop, Ready" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Amina Phone, Ready" })).toBeInTheDocument();
    expect(screen.getByText("Connecting")).toBeInTheDocument();
    expect(screen.getByText("Drag over")).toBeInTheDocument();
    expect(screen.getByText("Receiver selected")).toBeInTheDocument();
    expect(screen.getByText("Connection failed")).toBeInTheDocument();
    expect(screen.getAllByText("Browser limited").length).toBeGreaterThan(0);
  });

  it("renders progress and incoming transfer previews", () => {
    render(React.createElement(TransferSurface, { roomState: previewRoomState }));

    expect(screen.getByRole("progressbar", { name: "Sending portfolio.zip" })).toHaveAttribute(
      "aria-valuenow",
      "52"
    );
    expect(screen.getByRole("progressbar", { name: "Received brand-kit" })).toHaveAttribute(
      "aria-valuenow",
      "100"
    );
    expect(screen.getByLabelText("Incoming transfer preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("shows connecting, empty, and peer list states from room discovery", () => {
    const { rerender } = render(
      React.createElement(TransferSurface, {
        roomState: createFallbackRoomState({ status: "connecting", peers: [] })
      })
    );

    expect(screen.getByText("Connecting to nearby devices...")).toBeInTheDocument();

    rerender(
      React.createElement(TransferSurface, {
        roomState: createFallbackRoomState({ status: "connected", peers: [] })
      })
    );
    expect(screen.getByText("No devices connected yet")).toBeInTheDocument();

    rerender(React.createElement(TransferSurface, { roomState: previewRoomState }));
    expect(screen.getByText("4 devices connected")).toBeInTheDocument();
  });

  it("shows selected file manifest metadata", () => {
    render(React.createElement(TransferSurface, { roomState: previewRoomState }));

    const input = screen.getByLabelText("Choose files");
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });

    fireEvent.change(input, {
      target: {
        files: [file]
      }
    });

    expect(screen.getByLabelText("Selected file manifest")).toBeInTheDocument();
    expect(screen.getByText("1 file selected")).toBeInTheDocument();
    expect(screen.getByText("5 B ready for manifest approval")).toBeInTheDocument();
  });

  it("renders user-controlled names as text without executing markup", () => {
    const testWindow = window as Window & { __oppassumXss?: number };
    testWindow.__oppassumXss = undefined;
    render(
      React.createElement(TransferSurface, {
        roomState: createFallbackRoomState({
          peers: [
            {
              peerId: "peer-xss-test",
              displayName: "<img src=x onerror=window.__oppassumXss=1>",
              deviceType: "laptop"
            }
          ]
        })
      })
    );

    const input = screen.getByLabelText("Choose files");
    const file = new File(["safe"], "<script>window.__oppassumXss=1</script>.txt", {
      type: "text/plain"
    });

    fireEvent.change(input, {
      target: {
        files: [file]
      }
    });
    render(
      React.createElement(TransferDialog, {
        manifest: {
          transferId: "transfer-xss",
          files: [
            {
              id: "file-xss",
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified
            }
          ],
          totalBytes: file.size,
          createdAt: Date.now()
        }
      })
    );

    expect(screen.getByText("<img src=x onerror=window.__oppassumXss=1>")).toBeInTheDocument();
    expect(screen.getByText("<script>window.__oppassumXss=1</script>.txt")).toBeInTheDocument();
    expect(testWindow.__oppassumXss).toBeUndefined();
  });
});
