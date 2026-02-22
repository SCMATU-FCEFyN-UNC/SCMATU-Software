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

  const expandPanel = () => {
    const header = screen
      .getByText("Communication Panel")
      .closest(".communication-header");
    const toggle = header?.querySelector(".communication-toggle");
    if (toggle) {
      fireEvent.click(toggle);
    }
  };

  it("renders communication panel with default values", () => {
    render(<CommunicationPanel />);

    expect(screen.getByText("Communication Panel")).toBeInTheDocument();

    // Expand panel to see form fields
    expandPanel();

    // Now the button should be visible
    expect(screen.getByText("Check Available Ports")).toBeInTheDocument();

    // Wait for content to be visible and use more specific queries
    expect(screen.getByLabelText("Port:")).toBeInTheDocument();

    // Use getByDisplayValue for inputs
    expect(screen.getByDisplayValue("9600")).toBeInTheDocument(); // baudrate

    // For select elements, get by role and check value
    const paritySelect = screen.getAllByRole("combobox")[1]; // Second combobox (first is port)
    expect(paritySelect).toHaveValue("N");

    expect(screen.getByDisplayValue("1")).toBeInTheDocument(); // stopbits
    expect(screen.getByDisplayValue("8")).toBeInTheDocument(); // bytesize
    expect(screen.getByText("Connect Device")).toBeInTheDocument();
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
    expandPanel();

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
    expandPanel();

    await act(async () => {
      fireEvent.click(screen.getByText("Check Available Ports"));
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "⚠️ Failed to fetch available ports. Please try again.",
        ),
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

    // Mock ports fetch (called during connect to validate port)
    mockMakeRequest.mockResolvedValueOnce({
      data: { ports: mockPorts },
    });

    // Mock connect success
    mockMakeRequest.mockResolvedValueOnce({
      data: { success: true },
    });

    render(<CommunicationPanel />);
    expandPanel();

    await act(async () => {
      fireEvent.click(screen.getByText("Connect Device"));
    });

    // First call should be to validate ports
    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/ports", { method: "GET" });
    });

    // Second call should be to connect
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
    expandPanel();

    await act(async () => {
      fireEvent.click(screen.getByText("Disconnect Device"));
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
    expandPanel();

    const connectButton = screen.getByText("Connect Device");
    expect(connectButton).toBeDisabled();
  });

  it("disables form elements when connected", () => {
    // Mock no error message to avoid the error status
    const mockSetConnected = vi.fn();
    mockUseConnection.mockReturnValue({
      connected: true,
      setConnected: mockSetConnected,
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    render(<CommunicationPanel />);
    expandPanel();

    expect(screen.getByLabelText("Port:")).toBeDisabled();
    expect(screen.getByDisplayValue("9600")).toBeDisabled();

    // Get selects by role instead of label text
    const selects = screen.getAllByRole("combobox");
    const paritySelect = selects[1]; // Second combobox is parity
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
    expandPanel();

    const disconnectButton = screen.getByText("Disconnect Device");
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
    expandPanel();

    await act(async () => {
      fireEvent.click(screen.getByText("Connect Device"));
    });

    expect(screen.getByText("Connecting...")).toBeInTheDocument();
    expect(screen.getByText("Connecting...")).toBeDisabled();
  });

  it("handles connection failure", async () => {
    const mockSetConnected = vi.fn();
    mockUseConnection.mockReturnValue({
      connected: false,
      setConnected: mockSetConnected,
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    const mockPorts = [{ device: "COM3", description: "USB Serial Port" }];

    // Mock ports fetch (called during connect)
    mockMakeRequest.mockResolvedValueOnce({
      data: { ports: mockPorts },
    });

    // Mock connect failure
    mockMakeRequest.mockResolvedValueOnce({
      data: { success: false },
    });

    render(<CommunicationPanel />);
    expandPanel();

    await act(async () => {
      fireEvent.click(screen.getByText("Connect Device"));
    });

    await waitFor(() => {
      expect(
        screen.getByText("⚠️ Failed to connect to the selected port."),
      ).toBeInTheDocument();
    });
  });

  it("handles connection exception", async () => {
    // Mock console.error to suppress the error log in test output
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const mockSetConnected = vi.fn();
    mockUseConnection.mockReturnValue({
      connected: false,
      setConnected: mockSetConnected,
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
    expandPanel();

    await act(async () => {
      fireEvent.click(screen.getByText("Connect Device"));
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "⚠️ Failed to connect. Please check the device and try again.",
        ),
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
    expandPanel();

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
    expandPanel();

    await act(async () => {
      fireEvent.click(screen.getByText("Check Available Ports"));
    });

    await waitFor(() => {
      expect(mockSetConnected).toHaveBeenCalledWith(false);
      expect(mockSetSelectedPort).toHaveBeenCalledWith("");
      expect(
        screen.getByText("⚠️ Connection lost: port is no longer available."),
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
    mockUseConnection.mockReturnValue({
      connected: false,
      setConnected: vi.fn(),
      selectedPort: "",
      setSelectedPort: vi.fn(),
    });

    render(<CommunicationPanel />);
    expandPanel();

    const baudrateInput = screen.getByDisplayValue("9600");
    const stopbitsInput = screen.getByDisplayValue("1");
    const bytesizeInput = screen.getByDisplayValue("8");

    // Get selects by role instead of label text
    const selects = screen.getAllByRole("combobox");
    const paritySelect = selects[1]; // Second combobox is parity

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
    expandPanel();

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

  it("toggles collapsible section", () => {
    render(<CommunicationPanel />);

    // Initially, form content should not be visible (collapsed)
    expect(screen.queryByText("Connect Device")).not.toBeInTheDocument();

    // Expand panel
    expandPanel();

    // Now content should be visible
    expect(screen.getByText("Connect Device")).toBeInTheDocument();

    // Collapse again
    const header = screen
      .getByText("Communication Panel")
      .closest(".communication-header");
    const toggle = header?.querySelector(".communication-toggle");
    if (toggle) {
      fireEvent.click(toggle);
    }

    // Content should be hidden again
    expect(screen.queryByText("Connect Device")).not.toBeInTheDocument();
  });
});
