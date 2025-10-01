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
import { ConnectionStatusProvider } from "../../context/ConnectionStatusProvider";

vi.mock("../../utils/backendRequests");

// Helper wrapper to provide context
const renderWithConnection = (ui: React.ReactElement) => {
  return render(<ConnectionStatusProvider>{ui}</ConnectionStatusProvider>);
};

describe("CommunicationPanel", () => {
  const mockMakeRequest = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    mockMakeRequest.mockReset();
  });

  it("renders without crashing", async () => {
    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: mockMakeRequest,
      loading: false,
      error: null,
    });

    await act(async () => {
      renderWithConnection(<CommunicationPanel />);
    });

    expect(screen.getByText(/Communication Setup/i)).toBeInTheDocument();
  });

  it("fetches and displays available ports", async () => {
    mockMakeRequest.mockResolvedValue({
      data: { ports: [{ device: "COM3", description: "USB Serial Device" }] },
    });

    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: mockMakeRequest,
      loading: false,
      error: null,
    });

    await act(async () => {
      renderWithConnection(<CommunicationPanel />);
    });

    fireEvent.click(screen.getByText(/Check Available Ports/i));

    await waitFor(() => {
      expect(screen.getByText(/COM3 - USB Serial Device/)).toBeInTheDocument();
    });
  });

  it("connects when Connect is clicked", async () => {
    mockMakeRequest
      // 1️⃣ First call: manual "Check Available Ports"
      .mockResolvedValueOnce({
        data: { ports: [{ device: "COM3", description: "USB Serial Device" }] },
      })
      // 2️⃣ Second call: re-fetch ports before connect (still available)
      .mockResolvedValueOnce({
        data: { ports: [{ device: "COM3", description: "USB Serial Device" }] },
      })
      // 3️⃣ Third call: connect endpoint
      .mockResolvedValueOnce({ data: { success: true } });

    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: mockMakeRequest,
      loading: false,
      error: null,
    });

    await act(async () => {
      renderWithConnection(<CommunicationPanel />);
    });

    fireEvent.click(screen.getByText(/Check Available Ports/i));

    const portSelect = await screen.findByLabelText(/Port:/i);
    fireEvent.change(portSelect, { target: { value: "COM3" } });

    fireEvent.click(screen.getByRole("button", { name: /^Connect$/i }));

    expect(
      await screen.findByText(/Connected to COM3/i, { exact: false })
    ).toBeInTheDocument();
  });

  it("shows error if selected port is no longer available before connecting", async () => {
    mockMakeRequest
      // 1️⃣ Manual fetch
      .mockResolvedValueOnce({
        data: { ports: [{ device: "COM3", description: "USB Serial Device" }] },
      })
      // 2️⃣ Re-fetch before connect → no ports now
      .mockResolvedValueOnce({ data: { ports: [] } });

    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: mockMakeRequest,
      loading: false,
      error: null,
    });

    renderWithConnection(<CommunicationPanel />);

    fireEvent.click(screen.getByText(/Check Available Ports/i));
    const portSelect = await screen.findByLabelText(/Port:/i);
    fireEvent.change(portSelect, { target: { value: "COM3" } });

    fireEvent.click(screen.getByRole("button", { name: /^Connect$/i }));

    expect(
      await screen.findByText(/Selected port is no longer available/i)
    ).toBeInTheDocument();
    expect(portSelect).toHaveValue(""); // selection should be cleared
  });

  it("disables inputs while connected", async () => {
    mockMakeRequest
      // 1️⃣ Manual fetch
      .mockResolvedValueOnce({
        data: { ports: [{ device: "COM3", description: "USB Serial Device" }] },
      })
      // 2️⃣ Re-fetch before connect (still available)
      .mockResolvedValueOnce({
        data: { ports: [{ device: "COM3", description: "USB Serial Device" }] },
      })
      // 3️⃣ Connect success
      .mockResolvedValueOnce({ data: { success: true } });

    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: mockMakeRequest,
      loading: false,
      error: null,
    });

    renderWithConnection(<CommunicationPanel />);
    fireEvent.click(screen.getByText(/Check Available Ports/i));

    const portSelect = await screen.findByLabelText(/Port:/i);
    fireEvent.change(portSelect, { target: { value: "COM3" } });
    fireEvent.click(screen.getByRole("button", { name: /^Connect$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Connected to COM3/i)).toBeInTheDocument();
    });

    // Inputs must be disabled
    expect(portSelect).toBeDisabled();
    expect(screen.getByLabelText(/Baudrate/i)).toBeDisabled();
    expect(screen.getByLabelText(/Parity/i)).toBeDisabled();
  });

  it("auto-disconnects when ports no longer include selected port", async () => {
    mockMakeRequest
      // 1️⃣ First fetch (Check Available Ports)
      .mockResolvedValueOnce({
        data: { ports: [{ device: "COM3", description: "USB Serial Device" }] },
      })
      // 2️⃣ Re-fetch before connect (still available)
      .mockResolvedValueOnce({
        data: { ports: [{ device: "COM3", description: "USB Serial Device" }] },
      })
      // 3️⃣ Connect success
      .mockResolvedValueOnce({ data: { success: true } })
      // 4️⃣ Later polling → no ports now → should trigger auto-disconnect
      .mockResolvedValueOnce({ data: { ports: [] } });

    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: mockMakeRequest,
      loading: false,
      error: null,
    });

    renderWithConnection(<CommunicationPanel />);
    fireEvent.click(screen.getByText(/Check Available Ports/i));

    const portSelect = await screen.findByLabelText(/Port:/i);
    fireEvent.change(portSelect, { target: { value: "COM3" } });
    fireEvent.click(screen.getByRole("button", { name: /^Connect$/i }));

    await waitFor(() =>
      expect(screen.getByText(/Connected to COM3/i)).toBeInTheDocument()
    );

    // Trigger fetch ports again (simulate user manually refreshing)
    fireEvent.click(screen.getByText(/Check Available Ports/i));

    await waitFor(() => {
      expect(
        screen.getByText(/Connection lost: port is no longer available/i)
      ).toBeInTheDocument();
    });
  });

  it("disables connect button when no port is selected", async () => {
    mockMakeRequest.mockResolvedValue({
      data: { ports: [{ device: "COM3", description: "USB Serial Device" }] },
    });

    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: mockMakeRequest,
      loading: false,
      error: null,
    });

    await act(async () => {
      renderWithConnection(<CommunicationPanel />);
    });

    fireEvent.click(screen.getByText(/Check Available Ports/i));

    // Wait for loading to finish and ports to be loaded
    await waitFor(() => {
      expect(screen.getByText(/COM3 - USB Serial Device/)).toBeInTheDocument();
    });

    // Connect button should be disabled when no port is selected
    const connectButton = screen.getByRole("button", { name: /^Connect$/i });
    expect(connectButton).toBeDisabled();
  });

  it("enables connect button when port is selected", async () => {
    mockMakeRequest.mockResolvedValue({
      data: { ports: [{ device: "COM3", description: "USB Serial Device" }] },
    });

    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: mockMakeRequest,
      loading: false,
      error: null,
    });

    await act(async () => {
      renderWithConnection(<CommunicationPanel />);
    });

    fireEvent.click(screen.getByText(/Check Available Ports/i));

    // Wait for loading to finish and ports to be loaded
    await waitFor(() => {
      expect(screen.getByText(/COM3 - USB Serial Device/)).toBeInTheDocument();
    });

    const portSelect = await screen.findByLabelText(/Port:/i);
    fireEvent.change(portSelect, { target: { value: "COM3" } });

    // Connect button should be enabled when port is selected
    const connectButton = screen.getByRole("button", { name: /^Connect$/i });
    expect(connectButton).toBeEnabled();
  });

  it("shows loading state during port fetch", async () => {
    // Create a promise that we can resolve manually
    let resolveRequest: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveRequest = resolve;
    });

    mockMakeRequest.mockReturnValue(pendingPromise);

    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: mockMakeRequest,
      loading: false,
      error: null,
    });

    await act(async () => {
      renderWithConnection(<CommunicationPanel />);
    });

    fireEvent.click(screen.getByText(/Check Available Ports/i));

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    // Resolve the request
    await act(async () => {
      resolveRequest!({
        data: { ports: [{ device: "COM3", description: "USB Serial Device" }] },
      });
    });

    // Should go back to normal state
    await waitFor(() => {
      expect(screen.getByText("Check Available Ports")).toBeInTheDocument();
    });
  });
});
