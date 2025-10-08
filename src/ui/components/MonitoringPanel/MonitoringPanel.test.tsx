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

vi.mock("../../utils/backendRequests");
vi.mock("../../context/ConnectionStatusProvider");

const mockUseConnection = useConnection as Mock;
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
  });

  it("renders all monitoring fields correctly", async () => {
    await act(async () => {
      render(<MonitoringPanel />);
    });

    expect(screen.getByText("Monitoring Panel")).toBeInTheDocument();

    // Check that we have 6 input fields (all start empty)
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6); // Should have 6 input fields

    // Verify all inputs are empty
    inputs.forEach((input) => {
      expect(input).toHaveValue("");
    });

    expect(screen.getByText("🔄 Refresh All")).toBeInTheDocument();
  });

  it("fetches all metrics when Refresh All is clicked", async () => {
    const mockData = {
      phase: 45.0,
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

    // Check for the actual displayed values from the HTML output
    expect(screen.getByDisplayValue("45")).toBeInTheDocument(); // phase
    expect(screen.getByDisplayValue("220.500")).toBeInTheDocument(); // voltage
    expect(screen.getByDisplayValue("5.2000")).toBeInTheDocument(); // current
    expect(screen.getByDisplayValue("1146.600")).toBeInTheDocument(); // power
    expect(screen.getByDisplayValue("2.000e-2")).toBeInTheDocument(); // period
    expect(screen.getByDisplayValue("50.000")).toBeInTheDocument(); // resonance frequency (actual value from HTML)
    expect(
      screen.getByText("Status: obtained successfully")
    ).toBeInTheDocument();
    expect(screen.getByText("✅ Monitoring data updated")).toBeInTheDocument();
  });

  it("fetches individual metrics when refresh buttons are clicked", async () => {
    mockMakeRequest.mockImplementation((url: string) => {
      if (url === "/monitoring/phase") {
        return Promise.resolve({
          data: { success: true, phase: 30.0 },
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

    // Find refresh buttons by their text content within the field groups
    const fieldGroups = screen
      .getAllByRole("textbox")
      .map((input) => input.closest(".fieldGroup"));

    // Test phase refresh - first field group should be phase
    const phaseRefreshButton = fieldGroups[0]?.querySelector("button");

    await act(async () => {
      if (phaseRefreshButton) {
        fireEvent.click(phaseRefreshButton);
      }
    });

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/monitoring/phase", {
        method: "GET",
      });
    });

    expect(screen.getByDisplayValue("30")).toBeInTheDocument();
    expect(screen.getByText("✅ phase updated")).toBeInTheDocument();

    // Test voltage refresh - second field group should be voltage
    const voltageRefreshButton = fieldGroups[1]?.querySelector("button");

    await act(async () => {
      if (voltageRefreshButton) {
        fireEvent.click(voltageRefreshButton);
      }
    });

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/monitoring/voltage", {
        method: "GET",
      });
    });

    expect(screen.getByDisplayValue("230.000")).toBeInTheDocument();
  });

  it("fetches resonance frequency correctly", async () => {
    const resonanceData = {
      resonance_frequency: 45000,
      status_text: "obtained successfully",
    };

    mockMakeRequest.mockResolvedValueOnce({
      data: {
        success: true,
        resonance: resonanceData,
      },
    });

    await act(async () => {
      render(<MonitoringPanel />);
    });

    // Find the resonance field group (last one)
    const fieldGroups = screen
      .getAllByRole("textbox")
      .map((input) => input.closest(".fieldGroup"));
    const resonanceRefreshButton = fieldGroups[5]?.querySelector("button");

    await act(async () => {
      if (resonanceRefreshButton) {
        fireEvent.click(resonanceRefreshButton);
      }
    });

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/monitoring/resonance", {
        method: "GET",
      });
    });

    expect(screen.getByDisplayValue("45.000")).toBeInTheDocument(); // Actual formatted value
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

  describe("when disconnected", () => {
    beforeEach(() => {
      mockUseConnection.mockReturnValue({
        connected: false,
        setConnected: vi.fn(),
        selectedPort: "",
        setSelectedPort: vi.fn(),
      });
    });

    it("disables all buttons when disconnected", async () => {
      await act(async () => {
        render(<MonitoringPanel />);
      });

      const refreshAllButton = screen.getByText("🔄 Refresh All");
      expect(refreshAllButton).toBeDisabled();

      const refreshButtons = screen.getAllByText("Refresh");
      refreshButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it("shows warning message when disconnected", async () => {
      await act(async () => {
        render(<MonitoringPanel />);
      });

      expect(
        screen.getByText("⚠️ Connect to a device first")
      ).toBeInTheDocument();
    });

    it("does not make API calls when buttons are clicked while disconnected", async () => {
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
      phase: 12345,
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
      expect(screen.getByDisplayValue("12345")).toBeInTheDocument(); // phase (no formatting)
      expect(screen.getByDisplayValue("123.456")).toBeInTheDocument(); // voltage (3 decimal)
      expect(screen.getByDisplayValue("1.2346")).toBeInTheDocument(); // current (4 decimal, rounded)
      expect(screen.getByDisplayValue("152.415")).toBeInTheDocument(); // power (3 decimal)
      expect(screen.getByDisplayValue("1.230e-4")).toBeInTheDocument(); // period (scientific)
      expect(screen.getByDisplayValue("1.234.567")).toBeInTheDocument(); // resonance (actual formatted value)
    });
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
  });
});
