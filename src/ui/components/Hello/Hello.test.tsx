import { render, screen, waitFor, act } from "@testing-library/react";
import Hello from "./Hello";
import { vi, type Mock } from "vitest";
import { useBackendRequest } from "../../utils/backendRequests";

vi.mock("../../utils/backendRequests");

describe("Hello component", () => {
  it("renders loading state initially", async () => {
    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: vi.fn(),
      loading: true,
      error: null,
    });

    await act(async () => {
      render(<Hello />);
    });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders error state if backend hook has error", async () => {
    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: vi.fn(),
      loading: false,
      error: "Backend not available",
    });

    await act(async () => {
      render(<Hello />);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Error: Backend not available/i)
      ).toBeInTheDocument();
    });
  });

  it("renders message after successful request", async () => {
    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: vi
        .fn()
        .mockResolvedValue({ data: { message: "Hi there!" } }),
      loading: false,
      error: null,
    });

    await act(async () => {
      render(<Hello />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Backend message:/i)).toBeInTheDocument();
      expect(screen.getByText(/Hi there!/i)).toBeInTheDocument();
    });
  });

  it("renders error if makeRequest throws", async () => {
    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: vi.fn().mockRejectedValue(new Error("Network down")),
      loading: false,
      error: null,
    });

    await act(async () => {
      render(<Hello />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Error: Network down/i)).toBeInTheDocument();
    });
  });
});
