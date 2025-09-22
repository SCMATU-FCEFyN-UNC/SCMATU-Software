import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import CommunicationPanel from "./CommunicationPanel";
import { vi, type Mock } from "vitest";
import { useBackendRequest } from "../../utils/backendRequests";

vi.mock("../../utils/backendRequests");

describe("CommunicationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: vi.fn(),
      loading: false,
      error: null,
    });

    await act(async () => {
      render(<CommunicationPanel />);
    });

    expect(screen.getByText(/Communication Setup/i)).toBeInTheDocument();
  });

  it("fetches and displays available ports", async () => {
    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: vi.fn().mockResolvedValue({
        data: { ports: [{ device: "COM3", description: "USB Serial Device" }] },
      }),
      loading: false,
      error: null,
    });

    await act(async () => {
      render(<CommunicationPanel />);
    });

    fireEvent.click(screen.getByText(/Check Available Ports/i));

    await waitFor(() => {
      expect(screen.getByText(/COM3 - USB Serial Device/)).toBeInTheDocument();
    });
  });

  it("connects when Connect is clicked", async () => {
    const makeRequestMock = vi
      .fn()
      // First call: fetch ports
      .mockResolvedValueOnce({
        data: { ports: [{ device: "COM3", description: "USB Serial Device" }] },
      })
      // Second call: connect
      .mockResolvedValueOnce({ data: { success: true } });

    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: makeRequestMock,
      loading: false,
      error: null,
    });

    await act(async () => {
      render(<CommunicationPanel />);
    });

    fireEvent.click(screen.getByText(/Check Available Ports/i));

    const portSelect = await screen.findByLabelText(/Port:/i);
    fireEvent.change(portSelect, { target: { value: "COM3" } });

    fireEvent.click(screen.getByRole("button", { name: /^Connect$/i }));

    // ✅ Automatically waits until "Connected" text is rendered
    expect(
      await screen.findByText(/Connected to COM3/i, { exact: false })
    ).toBeInTheDocument();
  });
});
