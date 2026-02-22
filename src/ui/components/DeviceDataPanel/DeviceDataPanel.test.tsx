import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { vi, type Mock } from "vitest";

vi.mock("../../utils/backendRequests");
vi.mock("../../context/ConnectionStatusProvider");

// Mock the SerialNumberModal so we can test open/close behavior.
// The mock will render a simple element with data-testid "mock-sn-modal".
vi.mock("../SerialNumberModal/SerialNumberModal", () => {
  const React = require("react");
  return {
    default: ({ initialSerial, onClose, onSuccess }: any) =>
      React.createElement(
        "div",
        { "data-testid": "mock-sn-modal" },
        React.createElement("span", { key: "serial" }, initialSerial),
        React.createElement(
          "button",
          {
            key: "btn",
            onClick: () => {
              onSuccess?.();
              onClose?.();
            },
          },
          "Confirm",
        ),
      ),
  };
});

import DeviceDataPanel from "./DeviceDataPanel";
import { useBackendRequest } from "../../utils/backendRequests";
import { useConnection } from "../../context/ConnectionStatusProvider";

const mockUseConnection = useConnection as Mock;
const mockMakeRequest = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockMakeRequest.mockReset();
  (useBackendRequest as Mock).mockReturnValue({
    makeRequest: mockMakeRequest,
    loading: false,
    error: null,
  });

  // Default: disconnected
  mockUseConnection.mockReturnValue({
    connected: false,
    setConnected: vi.fn(),
    selectedPort: "",
    setSelectedPort: vi.fn(),
  });
});

// Helper function to expand the collapsed panel
const expandPanel = () => {
  const header = screen
    .getByText("Device Data Panel")
    .closest(".device-data-header");
  const toggle = header?.querySelector(".device-data-toggle");
  if (toggle) {
    fireEvent.click(toggle);
  }
};

describe("DeviceDataPanel", () => {
  it("renders fields and buttons disabled when disconnected", async () => {
    await act(async () => {
      render(<DeviceDataPanel />);
    });

    expect(screen.getByText("Device Data Panel")).toBeInTheDocument();

    // Expand panel to see the content
    expandPanel();

    // Serial controls
    expect(
      screen.getByRole("button", { name: /read serial number/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /update serial number/i }),
    ).toBeDisabled();

    // Refresh SN status
    expect(
      screen.getByRole("button", { name: /refresh status/i }),
    ).toBeDisabled();

    // Sample group Set/Get: first 'Set' button should be disabled
    const setButtons = screen.getAllByRole("button", { name: /set/i });
    setButtons.forEach((btn) => expect(btn).toBeDisabled());

    // Ensure no backend calls are made when disconnected
    fireEvent.click(
      screen.getByRole("button", { name: /read serial number/i }),
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(mockMakeRequest).not.toHaveBeenCalled();
  });

  it("fetches initial data and enables inputs when connected", async () => {
    // Prepare a generic successful response containing the keys used by handlers
    mockMakeRequest.mockResolvedValue({
      data: {
        success: true,
        serial_number: "12345",
        samples: 100,
        adc_samples: 10,
        shunt_res: 5,
        voltage_gain: 2,
        current_gain: 3,
        max_distance: 1,
        sweep_width: 20,
        closed_loop_enabled: true,
        control_period: 30,
        status: 1,
      },
    });

    mockUseConnection.mockReturnValue({
      connected: true,
      setConnected: vi.fn(),
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    await act(async () => {
      render(<DeviceDataPanel />);
    });

    // The component triggers multiple GETs in useEffect; ensure at least one call happened
    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalled();
    });

    // Expand panel to see the content
    expandPanel();

    // Verify the loaded message appears
    await waitFor(() => {
      expect(screen.getByText("✅ Device data loaded")).toBeInTheDocument();
    });

    // Inputs should be enabled - use getAllByDisplayValue since there might be multiple inputs with same value
    const samplesInputs = screen.getAllByDisplayValue("100");
    expect(samplesInputs.length).toBeGreaterThan(0);
    expect(samplesInputs[0]).toBeEnabled();

    // 'Set' buttons should be enabled
    const setButtons = screen.getAllByRole("button", { name: /set/i });
    setButtons.forEach((btn) => expect(btn).toBeEnabled());
  });

  it("calls set samples endpoint when Set is clicked", async () => {
    mockUseConnection.mockReturnValue({
      connected: true,
      setConnected: vi.fn(),
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    // First, make GETs resolve with some initial data
    mockMakeRequest.mockResolvedValue({
      data: {
        success: true,
        samples: 100,
        adc_samples: 10,
        shunt_res: 5,
        voltage_gain: 2,
        current_gain: 3,
        max_distance: 1,
        sweep_width: 20,
        control_period: 30,
      },
    });

    await act(async () => {
      render(<DeviceDataPanel />);
    });

    // Expand panel to see the content
    expandPanel();

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue("100")).toBeInTheDocument();
    });

    // Find the samples input by looking for input with value 100 (from mock data)
    // Since there might be multiple inputs with value 100, we need to identify the correct one
    const inputs = screen.getAllByDisplayValue("100");

    // The samples input is likely the first one in the device-data-fields section
    const samplesInput = inputs[0] as HTMLInputElement;

    // Change the value
    fireEvent.change(samplesInput, { target: { value: "150" } });

    // Ensure next POST resolves
    mockMakeRequest.mockResolvedValueOnce({ data: { success: true } });

    // Click the first Set button (Samples group)
    const setButtons = screen.getAllByRole("button", { name: /set/i });
    fireEvent.click(setButtons[0]);

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/samples", {
        method: "POST",
        data: { samples: 150 },
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/✅ Samples amount updated/i),
      ).toBeInTheDocument();
    });
  });

  it("opens serial number modal when Update Serial Number clicked", async () => {
    mockUseConnection.mockReturnValue({
      connected: true,
      setConnected: vi.fn(),
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    mockMakeRequest.mockResolvedValue({
      data: { success: true, serial_number: "ABC" },
    });

    await act(async () => {
      render(<DeviceDataPanel />);
    });

    // Expand panel to see the content
    expandPanel();

    const updateButton = screen.getByRole("button", {
      name: /update serial number/i,
    });
    expect(updateButton).toBeEnabled();

    fireEvent.click(updateButton);

    // Our mocked SerialNumberModal renders data-testid="mock-sn-modal"
    expect(await screen.findByTestId("mock-sn-modal")).toBeInTheDocument();
  });

  it("calls serial number status GET when Refresh Status is clicked", async () => {
    mockUseConnection.mockReturnValue({
      connected: true,
      setConnected: vi.fn(),
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    mockMakeRequest.mockResolvedValue({ data: { success: true } });

    await act(async () => {
      render(<DeviceDataPanel />);
    });

    // Expand panel to see the content
    expandPanel();

    const refreshBtn = screen.getByRole("button", { name: /refresh status/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(mockMakeRequest).toHaveBeenCalledWith("/serial_number_status", {
        method: "GET",
      });
    });
  });

  it("shows error message when request fails", async () => {
    mockUseConnection.mockReturnValue({
      connected: true,
      setConnected: vi.fn(),
      selectedPort: "COM3",
      setSelectedPort: vi.fn(),
    });

    // Make GETs succeed initially
    mockMakeRequest.mockResolvedValue({ data: { success: true } });

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await act(async () => {
      render(<DeviceDataPanel />);
    });

    // Expand panel to see the content
    expandPanel();

    // Now make the POST fail
    mockMakeRequest.mockRejectedValueOnce(new Error("Network error"));

    // Click first Set button
    const setButtons = screen.getAllByRole("button", { name: /set/i });
    fireEvent.click(setButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("❌ Request failed")).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });
});
