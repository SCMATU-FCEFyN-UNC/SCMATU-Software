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

    // There are 15 text inputs: 2 (phase) + 1 (voltage) + 1 (current) + 1 (power)
    // + 1 (period) + 9 (resonance grid: 3 rows * 3 columns) = 15
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(15);

    // Check that we have 5 unit selectors
    const selectors = screen.getAllByRole("combobox");
    expect(selectors).toHaveLength(5);

    // The first 6 inputs (phase, voltage, current, power, period) should be empty
    // and the last 9 (resonance grid) should show "-" when no data is loaded.
    inputs.slice(0, 6).forEach((input) => expect(input).toHaveValue(""));
    inputs.slice(6).forEach((input) => expect(input).toHaveValue("-"));

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
        status_code: 200,
        status_text: "obtained successfully",
        best_overall: {
          frequency: 50000,
          phase: 10,
          current: 5.2,
        },
        best_phase: null,
        best_current: null,
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

    // Check formatted values
    expect(screen.getByDisplayValue("1234")).toBeInTheDocument(); // phase time in ns
    expect(screen.getByDisplayValue("-45.00°")).toBeInTheDocument(); // phase angle
    expect(screen.getByDisplayValue("220.500")).toBeInTheDocument(); // voltage
    expect(screen.getByDisplayValue("5.2000")).toBeInTheDocument(); // current
    expect(screen.getByDisplayValue("1146.600")).toBeInTheDocument(); // power
    expect(screen.getByDisplayValue("0.020000")).toBeInTheDocument(); // period

    // resonance frequencies are displayed with locale formatting
    expect(
      screen.getByDisplayValue((50000).toLocaleString())
    ).toBeInTheDocument();
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

    const refreshButtons = screen.getAllByText("Refresh");
    await act(async () => {
      fireEvent.click(refreshButtons[0]); // Phase refresh
    });

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/monitoring/phase", {
        method: "GET",
      });
    });

    expect(screen.getByDisplayValue("500")).toBeInTheDocument();
    expect(screen.getByDisplayValue("30.00°")).toBeInTheDocument();
    expect(screen.getByText("✅ Phase updated")).toBeInTheDocument();

    mockMakeRequest.mockClear();

    await act(async () => {
      fireEvent.click(refreshButtons[1]); // Voltage refresh
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
          status_code: 200,
          status_text: "obtained successfully",
          best_overall: {
            frequency: 45000,
            phase: 8,
            current: 4.8,
          },
          best_phase: null,
          best_current: null,
        },
      },
    });

    await act(async () => {
      render(<MonitoringPanel />);
    });

    const refreshButtons = screen.getAllByText("Refresh");
    await act(async () => {
      fireEvent.click(refreshButtons[5]); // Resonance refresh button
    });

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/monitoring/resonance", {
        method: "GET",
      });
    });

    expect(
      screen.getByDisplayValue((45000).toLocaleString())
    ).toBeInTheDocument();
    expect(
      screen.getByText("Status: obtained successfully")
    ).toBeInTheDocument();
    expect(
      screen.getByText("✅ Resonance frequency updated")
    ).toBeInTheDocument();
  });

  it("handles API errors gracefully", async () => {
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
        status_code: 200,
        status_text: "measured",
        best_overall: {
          frequency: 1234567,
          phase: 90,
          current: 6.5,
        },
        best_phase: null,
        best_current: null,
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
      expect(screen.getByDisplayValue("12345")).toBeInTheDocument();
      expect(screen.getByDisplayValue("12345.00°")).toBeInTheDocument();
      expect(screen.getByDisplayValue("123.456")).toBeInTheDocument();
      expect(screen.getByDisplayValue("1.2346")).toBeInTheDocument();
      expect(screen.getByDisplayValue("152.415")).toBeInTheDocument();
      expect(screen.getByDisplayValue("1.230e-4")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue((1234567).toLocaleString())
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Status: measured")).toBeInTheDocument();
  });

  it("handles null values correctly", async () => {
    await act(async () => {
      render(<MonitoringPanel />);
    });

    // There are 15 text boxes; the first 6 are empty, last 9 show '-' placeholders.
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(15);
    inputs.slice(0, 6).forEach((i) => expect(i).toHaveValue(""));
    inputs.slice(6).forEach((i) => expect(i).toHaveValue("-"));
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

    expect(refreshAllButton).toBeDisabled();

    const refreshButtons = screen.getAllByText("Refresh");
    refreshButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });

    const measureResonanceButton = screen.getByText("📊 Measure Resonance");
    expect(measureResonanceButton).toBeDisabled();
  });

  it("shows phase relationships correctly", async () => {
    const mockData = {
      phase: { seconds: -0.000001874, degrees: -187.4 },
      voltage: 220.5,
      current: 5.2,
      power: 1146.6,
      period: 0.02,
      resonance: {
        status_code: 200,
        status_text: "obtained successfully",
        best_overall: {
          frequency: 50000,
          phase: 10,
          current: 5.2,
        },
        best_phase: null,
        best_current: null,
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
      phase: { seconds: 0.000001234, degrees: 123.4 },
      voltage: 220.5,
      current: 1.5,
      power: 330.75,
      period: 0.001,
      resonance: {
        status_code: 200,
        status_text: "obtained successfully",
        best_overall: {
          frequency: 50000,
          phase: 10,
          current: 5.2,
        },
        best_phase: null,
        best_current: null,
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

    const selectors = screen.getAllByRole("combobox");

    await act(async () => {
      fireEvent.change(selectors[0], { target: { value: "µs" } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.234")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(selectors[1], { target: { value: "rad" } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("0.686π")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(selectors[2], { target: { value: "mA" } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("1500.0000")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(selectors[3], { target: { value: "kVA" } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("0.331")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.change(selectors[4], { target: { value: "ms" } });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("1.000000")).toBeInTheDocument();
    });
  });

  it("disables unit selectors when disconnected or resonance is running", async () => {
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
    mockMakeRequest.mockImplementation(() => new Promise(() => {}));

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
