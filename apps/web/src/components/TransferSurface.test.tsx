import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

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

  it("shows discovered peers without demo transfer state cards", () => {
    render(React.createElement(TransferSurface, { roomState: previewRoomState }));

    expect(screen.getAllByRole("button", { name: "Studio Laptop, Ready" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Amina Phone, Ready" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Receiver selected")).not.toBeInTheDocument();
    expect(screen.queryByText("Connection failed")).not.toBeInTheDocument();
  });

  it("renders incoming transfer approvals only when a manifest exists", () => {
    const manifest = {
      transferId: "transfer-dialog-test",
      files: [
        {
          id: "file-dialog-test",
          name: "brand-kit.zip",
          size: 1024,
          type: "application/zip",
          lastModified: Date.now()
        }
      ],
      totalBytes: 1024,
      createdAt: Date.now()
    };

    render(React.createElement(TransferSurface, { roomState: previewRoomState }));

    expect(screen.queryByText("Design assets")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "Sending portfolio.zip" })).not.toBeInTheDocument();
    render(React.createElement(TransferDialog, { manifest, onAccept: vi.fn(), onReject: vi.fn() }));
    expect(screen.getByLabelText("Incoming transfer preview")).toBeInTheDocument();
    expect(screen.getByText("brand-kit.zip")).toBeInTheDocument();
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
    expect(screen.getByText(/5 B ready to share. Click Send on a device to share with./)).toBeInTheDocument();
    expect(screen.getAllByText("Send").length).toBeGreaterThan(0);
  });

  it("asks how to upload folders before sending", async () => {
    render(React.createElement(TransferSurface, { roomState: previewRoomState }));

    const input = screen.getByLabelText("Choose folder");
    const file = new File(["nested"], "nested.txt", { type: "text/plain" });

    Object.defineProperty(file, "webkitRelativePath", {
      value: "Project/docs/nested.txt"
    });

    fireEvent.change(input, {
      target: {
        files: [file]
      }
    });

    expect(screen.getByText("1 folder selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload as ZIP" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload as files" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Upload as ZIP" }));

    await waitFor(() => {
      expect(screen.getByText("1 file selected")).toBeInTheDocument();
    });
  });

  it("asks users to select files before choosing a device", () => {
    render(React.createElement(TransferSurface, { roomState: previewRoomState }));

    const studioLaptopButtons = screen.getAllByRole("button", { name: "Studio Laptop, Ready" });

    expect(studioLaptopButtons[0]).toBeDefined();
    fireEvent.click(studioLaptopButtons[0] as HTMLElement);

    expect(screen.getByText("Select files first")).toBeInTheDocument();
    expect(
      screen.getByText("Select files or a folder first, then choose a device to send.")
    ).toBeInTheDocument();
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

    expect(screen.getAllByText("<img src=x onerror=window.__oppassumXss=1>").length).toBeGreaterThan(0);
    expect(screen.getByText("<script>window.__oppassumXss=1</script>.txt")).toBeInTheDocument();
    expect(testWindow.__oppassumXss).toBeUndefined();
  });
});
