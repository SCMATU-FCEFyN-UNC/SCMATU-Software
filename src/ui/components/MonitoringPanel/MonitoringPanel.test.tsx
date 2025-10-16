import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import MonitoringPanel from "./MonitoringPanel";
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

describe("MonitoringPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMakeRequest.mockReset();
    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: mockMakeRequest,
      loading: false,
      error: null,
    });

    mockUseConnection.mockReturnValue({
      connected: true,
      setConnected: vi.fn(),
      selectedPort: "",
      setSelectedPort: vi.fn(),
    });

    mockUseResonanceStatus.mockReturnValue({
      running: false,
      setRunning: vi.fn(),
    });
  });

  it("renders all monitoring fields correctly", async () => {
    await act(async () => {
      render(<MonitoringPanel />);
    });

    expect(screen.getByText("Monitoring Panel")).toBeInTheDocument();

    // Check that we have 7 input fields
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(7);

    // Check that we have 5 unit selectors
    const selectors = screen.getAllByRole("combobox");
    expect(selectors).toHaveLength(5);

    // Verify all inputs are empty
    inputs.forEach((input) => {
      expect(input).toHaveValue("");
    });

    expect(screen.getByText("🔄 Refresh All")).toBeInTheDocument();
    expect(screen.getByText("📊 Measure Resonance")).toBeInTheDocument();
  });

  it("fetches all metrics when Refresh All is clicked", async () => {
    const mockData = {
      phase: { seconds: -0.000001234, degrees: -45.0 },
      voltage: 220.5,
      current: 5.2,
      power: 1146.6,
      period: 0.02,
      resonance: {
        resonance_frequency: 50000,
        status_text: "obtained successfully",
      },
    };

    mockMakeRequest.mockResolvedValueOnce({
      data: {
        success: true,
        data: mockData,
      },
    });

    await act(async () => {
      render(<MonitoringPanel />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("🔄 Refresh All"));
    });

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/monitoring", {
        method: "GET",
      });
    });

    // Check for the actual displayed values
    expect(screen.getByDisplayValue("1234")).toBeInTheDocument(); // phase time in ns
    expect(screen.getByDisplayValue("-45.00°")).toBeInTheDocument(); // phase angle in degrees
    expect(screen.getByDisplayValue("220.500")).toBeInTheDocument(); // voltage
    expect(screen.getByDisplayValue("5.2000")).toBeInTheDocument(); // current
    expect(screen.getByDisplayValue("1146.600")).toBeInTheDocument(); // power
    expect(screen.getByDisplayValue("0.020000")).toBeInTheDocument(); // period
    expect(screen.getByDisplayValue("50.000")).toBeInTheDocument(); // resonance frequency (FIXED: no commas)
    expect(
      screen.getByText("Status: obtained successfully")
    ).toBeInTheDocument();
    expect(screen.getByText("✅ Monitoring data updated")).toBeInTheDocument();
  });

  it("fetches individual metrics when refresh buttons are clicked", async () => {
    mockMakeRequest.mockImplementation((url: string) => {
      if (url === "/monitoring/phase") {
        return Promise.resolve({
          data: {
            success: true,
            phase: { seconds: 0.0000005, degrees: 30.0 }, // 500 ns
          },
        });
      }
      if (url === "/monitoring/voltage") {
        return Promise.resolve({
          data: { success: true, voltage: 230.0 },
        });
      }
      return Promise.reject(new Error("Unexpected URL"));
    });

    await act(async () => {
      render(<MonitoringPanel />);
    });

    // Find all refresh buttons and click the phase one (first one)
    const refreshButtons = screen.getAllByText("Refresh");
    await act(async () => {
      fireEvent.click(refreshButtons[0]); // Phase refresh button
    });

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/monitoring/phase", {
        method: "GET",
      });
    });

    expect(screen.getByDisplayValue("500")).toBeInTheDocument(); // phase time in ns
    expect(screen.getByDisplayValue("30.00°")).toBeInTheDocument(); // phase angle in degrees
    expect(screen.getByText("✅ Phase updated")).toBeInTheDocument();

    // Reset mock calls to track the next one
    mockMakeRequest.mockClear();

    // Click voltage refresh button (second one)
    await act(async () => {
      fireEvent.click(refreshButtons[1]); // Voltage refresh button
    });

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/monitoring/voltage", {
        method: "GET",
      });
    });

    expect(screen.getByDisplayValue("230.000")).toBeInTheDocument();
  });

  it("fetches resonance frequency correctly", async () => {
    mockMakeRequest.mockResolvedValueOnce({
      data: {
        success: true,
        resonance: {
          resonance_frequency: 45000,
          status_text: "obtained successfully",
        },
      },
    });

    await act(async () => {
      render(<MonitoringPanel />);
    });

    // Find all refresh buttons and click the resonance one (last one)
    const refreshButtons = screen.getAllByText("Refresh");
    await act(async () => {
      fireEvent.click(refreshButtons[5]); // Resonance refresh button (6th button)
    });

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/monitoring/resonance", {
        method: "GET",
      });
    });

    expect(screen.getByDisplayValue("45.000")).toBeInTheDocument(); // FIXED: no commas
    expect(
      screen.getByText("Status: obtained successfully")
    ).toBeInTheDocument();
    expect(
      screen.getByText("✅ Resonance frequency updated")
    ).toBeInTheDocument();
  });

  it("handles API errors gracefully", async () => {
    // Mock console.error to suppress the error log in test output
    const consoleErrorMock = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockMakeRequest.mockRejectedValueOnce(new Error("Network error"));

    await act(async () => {
      render(<MonitoringPanel />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("🔄 Refresh All"));
    });

    await waitFor(() => {
      expect(screen.getByText("❌ Request failed")).toBeInTheDocument();
    });

    // Restore console.error
    consoleErrorMock.mockRestore();
  });

  it("handles API response with success: false", async () => {
    mockMakeRequest.mockResolvedValueOnce({
      data: {
        success: false,
        error: "Device not responding",
      },
    });

    await act(async () => {
      render(<MonitoringPanel />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("🔄 Refresh All"));
    });

    await waitFor(() => {
      expect(screen.getByText("❌ Device not responding")).toBeInTheDocument();
    });
  });

  describe("when disconnected or resonance is running", () => {
    it("disables all buttons when disconnected", async () => {
      mockUseConnection.mockReturnValue({
        connected: false,
        setConnected: vi.fn(),
        selectedPort: "",
        setSelectedPort: vi.fn(),
      });

      await act(async () => {
        render(<MonitoringPanel />);
      });

      const refreshAllButton = screen.getByText("🔄 Refresh All");
      const measureResonanceButton = screen.getByText("📊 Measure Resonance");

      expect(refreshAllButton).toBeDisabled();
      expect(measureResonanceButton).toBeDisabled();

      const refreshButtons = screen.getAllByText("Refresh");
      refreshButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it("disables all buttons when resonance is running", async () => {
      mockUseResonanceStatus.mockReturnValue({
        running: true,
        setRunning: vi.fn(),
      });

      await act(async () => {
        render(<MonitoringPanel />);
      });

      const refreshAllButton = screen.getByText("🔄 Refresh All");
      const measureResonanceButton = screen.getByText("📊 Measure Resonance");

      expect(refreshAllButton).toBeDisabled();
      expect(measureResonanceButton).toBeDisabled();

      const refreshButtons = screen.getAllByText("Refresh");
      refreshButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it("shows warning message when disconnected", async () => {
      mockUseConnection.mockReturnValue({
        connected: false,
        setConnected: vi.fn(),
        selectedPort: "",
        setSelectedPort: vi.fn(),
      });

      await act(async () => {
        render(<MonitoringPanel />);
      });

      expect(
        screen.getByText("⚠️ Connect to a device first")
      ).toBeInTheDocument();
    });

    it("does not make API calls when buttons are clicked while disconnected", async () => {
      mockUseConnection.mockReturnValue({
        connected: false,
        setConnected: vi.fn(),
        selectedPort: "",
        setSelectedPort: vi.fn(),
      });

      await act(async () => {
        render(<MonitoringPanel />);
      });

      const refreshAllButton = screen.getByText("🔄 Refresh All");

      await act(async () => {
        fireEvent.click(refreshAllButton);
      });

      // Wait to ensure no API calls are made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockMakeRequest).not.toHaveBeenCalled();
    });
  });

  it("formats numbers correctly", async () => {
    const mockData = {
      phase: { seconds: 0.000012345, degrees: 12345 },
      voltage: 123.456,
      current: 1.23456,
      power: 152.415,
      period: 0.000123,
      resonance: {
        resonance_frequency: 1234567,
        status_text: "measured",
      },
    };

    mockMakeRequest.mockResolvedValueOnce({
      data: {
        success: true,
        data: mockData,
      },
    });

    await act(async () => {
      render(<MonitoringPanel />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("🔄 Refresh All"));
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("12345")).toBeInTheDocument(); // phase time (ns)
      expect(screen.getByDisplayValue("12345.00°")).toBeInTheDocument(); // phase angle (degrees)
      expect(screen.getByDisplayValue("123.456")).toBeInTheDocument(); // voltage
      expect(screen.getByDisplayValue("1.2346")).toBeInTheDocument(); // current
      expect(screen.getByDisplayValue("152.415")).toBeInTheDocument(); // power
      expect(screen.getByDisplayValue("1.230e-4")).toBeInTheDocument(); // period
      expect(screen.getByDisplayValue("1.234.567")).toBeInTheDocument(); // FIXED: resonance frequency with dots
    });

    expect(screen.getByText("Status: measured")).toBeInTheDocument();
  });

  it("handles null values correctly", async () => {
    await act(async () => {
      render(<MonitoringPanel />);
    });

    // All inputs should be empty when data is null
    const inputs = screen.getAllByRole("textbox");
    inputs.forEach((input) => {
      expect(input).toHaveValue("");
    });
  });

  it("shows loading state during requests", async () => {
    mockMakeRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

    await act(async () => {
      render(<MonitoringPanel />);
    });

    const refreshAllButton = screen.getByText("🔄 Refresh All");

    await act(async () => {
      fireEvent.click(refreshAllButton);
    });

    // Button should be disabled during loading
    expect(refreshAllButton).toBeDisabled();

    // Check that individual refresh buttons are also disabled during loading
    const refreshButtons = screen.getAllByText("Refresh");
    refreshButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });

    // Check that Measure Resonance button is also disabled
    const measureResonanceButton = screen.getByText("📊 Measure Resonance");
    expect(measureResonanceButton).toBeDisabled();
  });

  it("shows phase relationships correctly", async () => {
    const mockData = {
      phase: { seconds: -0.000001874, degrees: -187.4 }, // Negative phase - current leads voltage
      voltage: 220.5,
      current: 5.2,
      power: 1146.6,
      period: 0.02,
      resonance: {
        resonance_frequency: 50000,
        status_text: "obtained successfully",
      },
    };

    mockMakeRequest.mockResolvedValueOnce({
      data: {
        success: true,
        data: mockData,
      },
    });

    await act(async () => {
      render(<MonitoringPanel />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("🔄 Refresh All"));
    });

    await waitFor(() => {
      expect(screen.getByText("(current leads voltage)")).toBeInTheDocument();
    });

    // Test positive phase - voltage leads current
    const mockDataPositive = {
      ...mockData,
      phase: { seconds: 0.000001874, degrees: 187.4 },
    };

    mockMakeRequest.mockResolvedValueOnce({
      data: {
        success: true,
        data: mockDataPositive,
      },
    });

    await act(async () => {
      fireEvent.click(screen.getByText("🔄 Refresh All"));
    });

    await waitFor(() => {
      expect(screen.getByText("(voltage leads current)")).toBeInTheDocument();
    });

    // Test zero phase - in phase
    const mockDataZero = {
      ...mockData,
      phase: { seconds: 0, degrees: 0 },
    };

    mockMakeRequest.mockResolvedValueOnce({
      data: {
        success: true,
        data: mockDataZero,
      },
    });

    await act(async () => {
      fireEvent.click(screen.getByText("🔄 Refresh All"));
    });

    await waitFor(() => {
      expect(screen.getByText("(in phase)")).toBeInTheDocument();
    });
  });

  it("allows unit selection changes", async () => {
    const mockData = {
      phase: { seconds: 0.000001234, degrees: 123.4 }, // 1234 ns
      voltage: 220.5,
      current: 1.5, // 1.5 A
      power: 330.75, // 330.75 VA
      period: 0.001, // 0.001 s
      resonance: {
        resonance_frequency: 50000,
        status_text: "obtained successfully",
      },
    };

    mockMakeRequest.mockResolvedValueOnce({
      data: {
        success: true,
        data: mockData,
      },
    });

    await act(async () => {
      render(<MonitoringPanel />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("🔄 Refresh All"));
    });

    // Get all unit selectors
    const selectors = screen.getAllByRole("combobox");

    // Change phase time from ns to µs
    await act(async () => {
      fireEvent.change(selectors[0], { target: { value: "µs" } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.234")).toBeInTheDocument(); // 1234 ns = 1.234 µs
    });

    // Change phase angle from degrees to radians
    await act(async () => {
      fireEvent.change(selectors[1], { target: { value: "rad" } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("0.686π")).toBeInTheDocument(); // 123.4° ≈ 0.686π rad
    });

    // Change current from A to mA
    await act(async () => {
      fireEvent.change(selectors[2], { target: { value: "mA" } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("1500.0000")).toBeInTheDocument(); // 1.5 A = 1500 mA
    });

    // Change power from VA to kVA
    await act(async () => {
      fireEvent.change(selectors[3], { target: { value: "kVA" } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("0.331")).toBeInTheDocument(); // 330.75 VA = 0.33075 kVA
    });

    // Change period from s to ms
    await act(async () => {
      fireEvent.change(selectors[4], { target: { value: "ms" } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.000000")).toBeInTheDocument(); // 0.001 s = 1 ms
    });
  });

  it("disables unit selectors when disconnected or resonance is running", async () => {
    // Test when disconnected
    mockUseConnection.mockReturnValue({
      connected: false,
      setConnected: vi.fn(),
      selectedPort: "",
      setSelectedPort: vi.fn(),
    });

    await act(async () => {
      render(<MonitoringPanel />);
    });

    const selectorsWhenDisconnected = screen.getAllByRole("combobox");
    selectorsWhenDisconnected.forEach((selector) => {
      expect(selector).toBeDisabled();
    });

    // Test when resonance is running
    mockUseConnection.mockReturnValue({
      connected: true,
      setConnected: vi.fn(),
      selectedPort: "",
      setSelectedPort: vi.fn(),
    });
    mockUseResonanceStatus.mockReturnValue({
      running: true,
      setRunning: vi.fn(),
    });

    await act(async () => {
      render(<MonitoringPanel />);
    });

    const selectorsWhenRunning = screen.getAllByRole("combobox");
    selectorsWhenRunning.forEach((selector) => {
      expect(selector).toBeDisabled();
    });
  });

  it("disables unit selectors when loading", async () => {
    mockMakeRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

    await act(async () => {
      render(<MonitoringPanel />);
    });

    const refreshAllButton = screen.getByText("🔄 Refresh All");

    await act(async () => {
      fireEvent.click(refreshAllButton);
    });

    const selectors = screen.getAllByRole("combobox");
    selectors.forEach((selector) => {
      expect(selector).toBeDisabled();
    });
  });

  it("renders Measure Resonance button", async () => {
    await act(async () => {
      render(<MonitoringPanel />);
    });

    expect(screen.getByText("📊 Measure Resonance")).toBeInTheDocument();
  });
});
