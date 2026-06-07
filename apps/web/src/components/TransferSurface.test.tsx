import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { TransferSurface } from "./TransferSurface";

describe("TransferSurface", () => {
  it("renders the required static upload shell", () => {
    render(<TransferSurface />);

    expect(screen.getByLabelText("Oppassum home")).toBeInTheDocument();
    expect(screen.getByLabelText("Information")).toBeInTheDocument();
    expect(screen.getByLabelText("Choose files")).toBeInTheDocument();
    expect(screen.getByLabelText("Choose folder")).toBeInTheDocument();
    expect(screen.getByText("Upload Files")).toBeInTheDocument();
    expect(screen.getByText("Upload Folder")).toBeInTheDocument();
  });

  it("shows mock peers and transfer states for Phase 2", () => {
    render(<TransferSurface />);

    expect(screen.getByRole("button", { name: "Studio Laptop, Ready" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Amina Phone, Selected" })).toBeInTheDocument();
    expect(screen.getByText("Connecting")).toBeInTheDocument();
    expect(screen.getByText("Drag over")).toBeInTheDocument();
    expect(screen.getByText("Receiver selected")).toBeInTheDocument();
    expect(screen.getByText("Connection failed")).toBeInTheDocument();
    expect(screen.getByText("Browser limited")).toBeInTheDocument();
  });

  it("renders progress and incoming transfer previews", () => {
    render(<TransferSurface />);

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
});
