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
import { useConnection } from "../../context/ConnectionStatusProvider";
import { useResonanceStatus } from "../../context/ResonanceStatusProvider";

vi.mock("../../utils/backendRequests");
vi.mock("../../context/ConnectionStatusProvider");
vi.mock("../../context/ResonanceStatusProvider");

const mockUseConnection = useConnection as Mock;
const mockUseResonanceStatus = useResonanceStatus as Mock;
const mockMakeRequest = vi.fn();

describe("CommunicationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMakeRequest.mockReset();
    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: mockMakeRequest,
      loading: false,
      error: null,
    });

    mockUseConnection.mockReturnValue({
      connected: false,
      setConnected: vi.fn(),
      selectedPort: "",
      setSelectedPort: vi.fn(),
    });

    mockUseResonanceStatus.mockReturnValue({
      running: false,
      setRunning: vi.fn(),
    });
  });

  it("renders communication panel with default values", () => {
    render(<CommunicationPanel />);

    expect(screen.getByText("Communication Setup")).toBeInTheDocument();
    expect(screen.getByText("Check Available Ports")).toBeInTheDocument();
    expect(screen.getByLabelText("Port:")).toBeInTheDocument();
    expect(screen.getByDisplayValue("9600")).toBeInTheDocument(); // baudrate

    // For select elements, check that the option with value "N" is selected
    const paritySelect = screen.getByLabelText(/Parity:/);
    expect(paritySelect).toHaveValue("N");

    expect(screen.getByDisplayValue("1")).toBeInTheDocument(); // stopbits
    expect(screen.getByDisplayValue("8")).toBeInTheDocument(); // bytesize
    expect(screen.getByText("Connect")).toBeInTheDocument();
    expect(screen.getByText("🔌 Not connected")).toBeInTheDocument();
  });

  it("fetches available ports when button is clicked", async () => {
    const mockPorts = [
      { device: "COM1", description: "Serial Port 1" },
      { device: "COM3", description: "USB Serial Port" },
    ];

    mockMakeRequest.mockResolvedValueOnce({
      data: { ports: mockPorts },
    });

    render(<CommunicationPanel />);

    await act(async () => {
      fireEvent.click(screen.getByText("Check Available Ports"));
    });

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/ports", { method: "GET" });
    });

    // Verify ports are populated in dropdown
    expect(screen.getByText("COM1 - Serial Port 1")).toBeInTheDocument();
    expect(screen.getByText("COM3 - USB Serial Port")).toBeInTheDocument();
  });

  it("handles port fetch errors", async () => {
    // Mock console.error to suppress the error log in test output
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockMakeRequest.mockRejectedValueOnce(new Error("Network error"));

    render(<CommunicationPanel />);

    await act(async () => {
      fireEvent.click(screen.getByText("Check Available Ports"));
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "⚠️ Failed to fetch available ports. Please try again."
        )
      ).toBeInTheDocument();
    });

    // Restore console.error
    consoleErrorMock.mockRestore();
  });

  it("connects to selected port with correct parameters", async () => {
    const mockSetConnected = vi.fn();
    mockUseConnection.mockReturnValue({
      connected: false,
      setConnected: mockSetConnected,
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    const mockPorts = [
      { device: "COM1", description: "Serial Port 1" },
      { device: "COM3", description: "USB Serial Port" },
    ];

    // Mock ports fetch
    mockMakeRequest.mockResolvedValueOnce({
      data: { ports: mockPorts },
    });

    // Mock connect success
    mockMakeRequest.mockResolvedValueOnce({
      data: { success: true },
    });

    render(<CommunicationPanel />);

    await act(async () => {
      fireEvent.click(screen.getByText("Connect"));
    });

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/ports", { method: "GET" });
    });

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/connect", {
        method: "POST",
        data: {
          port: "COM3",
          baudrate: 9600,
          parity: "N",
          stopbits: 1,
          bytesize: 8,
        },
      });
    });

    expect(mockSetConnected).toHaveBeenCalledWith(true);
  });

  it("disconnects from port", async () => {
    const mockSetConnected = vi.fn();
    mockUseConnection.mockReturnValue({
      connected: true,
      setConnected: mockSetConnected,
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    mockMakeRequest.mockResolvedValueOnce({
      data: { success: true },
    });

    render(<CommunicationPanel />);

    await act(async () => {
      fireEvent.click(screen.getByText("Disconnect"));
    });

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/disconnect", {
        method: "POST",
      });
    });

    expect(mockSetConnected).toHaveBeenCalledWith(false);
  });

  it("prevents connection when no port is selected", () => {
    mockUseConnection.mockReturnValue({
      connected: false,
      setConnected: vi.fn(),
      selectedPort: "",
      setSelectedPort: vi.fn(),
    });

    render(<CommunicationPanel />);

    const connectButton = screen.getByText("Connect");
    expect(connectButton).toBeDisabled();
  });

  it("disables form elements when connected", () => {
    mockUseConnection.mockReturnValue({
      connected: true,
      setConnected: vi.fn(),
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    render(<CommunicationPanel />);

    expect(screen.getByLabelText("Port:")).toBeDisabled();
    expect(screen.getByDisplayValue("9600")).toBeDisabled();

    // Check parity select is disabled and has correct value
    const paritySelect = screen.getByLabelText(/Parity:/);
    expect(paritySelect).toBeDisabled();
    expect(paritySelect).toHaveValue("N");

    expect(screen.getByDisplayValue("1")).toBeDisabled();
    expect(screen.getByDisplayValue("8")).toBeDisabled();
  });

  it("disables disconnect button when resonance is running", () => {
    mockUseConnection.mockReturnValue({
      connected: true,
      setConnected: vi.fn(),
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    mockUseResonanceStatus.mockReturnValue({
      running: true,
      setRunning: vi.fn(),
    });

    render(<CommunicationPanel />);

    const disconnectButton = screen.getByText("Disconnect");
    expect(disconnectButton).toBeDisabled();
  });

  it("shows loading states during operations", async () => {
    mockUseConnection.mockReturnValue({
      connected: false,
      setConnected: vi.fn(),
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    // Mock a request that never resolves to test loading state
    mockMakeRequest.mockImplementation(() => new Promise(() => {}));

    render(<CommunicationPanel />);

    await act(async () => {
      fireEvent.click(screen.getByText("Connect"));
    });

    expect(screen.getByText("Connecting...")).toBeInTheDocument();
    expect(screen.getByText("Connecting...")).toBeDisabled();
  });

  it("handles connection failure", async () => {
    mockUseConnection.mockReturnValue({
      connected: false,
      setConnected: vi.fn(),
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    const mockPorts = [{ device: "COM3", description: "USB Serial Port" }];

    // Mock ports fetch
    mockMakeRequest.mockResolvedValueOnce({
      data: { ports: mockPorts },
    });

    // Mock connect failure
    mockMakeRequest.mockResolvedValueOnce({
      data: { success: false },
    });

    render(<CommunicationPanel />);

    await act(async () => {
      fireEvent.click(screen.getByText("Connect"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("⚠️ Failed to connect to the selected port.")
      ).toBeInTheDocument();
    });
  });

  it("handles connection exception", async () => {
    // Mock console.error to suppress the error log in test output
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockUseConnection.mockReturnValue({
      connected: false,
      setConnected: vi.fn(),
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    const mockPorts = [{ device: "COM3", description: "USB Serial Port" }];

    // Mock ports fetch
    mockMakeRequest.mockResolvedValueOnce({
      data: { ports: mockPorts },
    });

    // Mock connect exception
    mockMakeRequest.mockRejectedValueOnce(new Error("Connection failed"));

    render(<CommunicationPanel />);

    await act(async () => {
      fireEvent.click(screen.getByText("Connect"));
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "⚠️ Failed to connect. Please check the device and try again."
        )
      ).toBeInTheDocument();
    });

    // Restore console.error
    consoleErrorMock.mockRestore();
  });

  it("clears selected port if it disappears from available ports", async () => {
    const mockSetSelectedPort = vi.fn();
    const mockSetConnected = vi.fn();

    mockUseConnection.mockReturnValue({
      connected: false,
      setConnected: mockSetConnected,
      selectedPort: "COM2", // This port will not be in the fetched list
      setSelectedPort: mockSetSelectedPort,
    });

    const mockPorts = [
      { device: "COM1", description: "Serial Port 1" },
      { device: "COM3", description: "USB Serial Port" },
    ];

    mockMakeRequest.mockResolvedValueOnce({
      data: { ports: mockPorts },
    });

    render(<CommunicationPanel />);

    await act(async () => {
      fireEvent.click(screen.getByText("Check Available Ports"));
    });

    await waitFor(() => {
      expect(mockSetSelectedPort).toHaveBeenCalledWith("");
    });
  });

  it("auto-disconnects when port disappears while connected", async () => {
    const mockSetConnected = vi.fn();
    const mockSetSelectedPort = vi.fn();

    mockUseConnection.mockReturnValue({
      connected: true,
      setConnected: mockSetConnected,
      selectedPort: "COM2", // This port will not be in the fetched list
      setSelectedPort: mockSetSelectedPort,
    });

    const mockPorts = [
      { device: "COM1", description: "Serial Port 1" },
      { device: "COM3", description: "USB Serial Port" },
    ];

    mockMakeRequest.mockResolvedValueOnce({
      data: { ports: mockPorts },
    });

    render(<CommunicationPanel />);

    await act(async () => {
      fireEvent.click(screen.getByText("Check Available Ports"));
    });

    await waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(false);
      expect(mockSetSelectedPort).toHaveBeenCalledWith("");
      expect(
        screen.getByText("⚠️ Connection lost: port is no longer available.")
      ).toBeInTheDocument();
    });
  });

  it("shows connected status when connected", () => {
    mockUseConnection.mockReturnValue({
      connected: true,
      setConnected: vi.fn(),
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    render(<CommunicationPanel />);

    expect(screen.getByText("✅ Connected to COM3")).toBeInTheDocument();
  });

  it("allows changing communication parameters when not connected", () => {
    render(<CommunicationPanel />);

    const baudrateInput = screen.getByDisplayValue("9600");
    const paritySelect = screen.getByLabelText(/Parity:/);
    const stopbitsInput = screen.getByDisplayValue("1");
    const bytesizeInput = screen.getByDisplayValue("8");

    expect(baudrateInput).not.toBeDisabled();
    expect(paritySelect).not.toBeDisabled();
    expect(stopbitsInput).not.toBeDisabled();
    expect(bytesizeInput).not.toBeDisabled();

    // Test changing values
    fireEvent.change(baudrateInput, { target: { value: "115200" } });
    fireEvent.change(paritySelect, { target: { value: "E" } });
    fireEvent.change(stopbitsInput, { target: { value: "2" } });
    fireEvent.change(bytesizeInput, { target: { value: "7" } });

    expect(screen.getByDisplayValue("115200")).toBeInTheDocument();
    expect(paritySelect).toHaveValue("E");
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("7")).toBeInTheDocument();
  });

  it("handles empty ports array gracefully", async () => {
    mockMakeRequest.mockResolvedValueOnce({
      data: { ports: [] },
    });

    render(<CommunicationPanel />);

    await act(async () => {
      fireEvent.click(screen.getByText("Check Available Ports"));
    });

    await waitFor(() => {
      expect(screen.getByText("Select a Port")).toBeInTheDocument();
      // Should only have the default option in the port select
      const portSelect = screen.getByLabelText("Port:");
      const portOptions = portSelect.querySelectorAll("option");
      expect(portOptions).toHaveLength(1); // Only "Select a Port" option
    });
  });
});
