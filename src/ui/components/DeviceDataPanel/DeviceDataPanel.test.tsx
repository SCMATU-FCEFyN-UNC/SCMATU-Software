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
          "Confirm"
        )
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

describe("DeviceDataPanel", () => {
  it("renders fields and buttons disabled when disconnected", async () => {
    await act(async () => {
      render(<DeviceDataPanel />);
    });

    expect(screen.getByText("Device Data Panel")).toBeInTheDocument();

    // Serial controls
    expect(screen.getByRole("button", { name: /read/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /update serial number/i })
    ).toBeDisabled();

    // Refresh SN status
    expect(
      screen.getByRole("button", { name: /refresh status/i })
    ).toBeDisabled();

    // Sample group Set/Get: first 'Set' button should be disabled
    const setButtons = screen.getAllByRole("button", { name: /set/i });
    setButtons.forEach((btn) => expect(btn).toBeDisabled());

    // Ensure no backend calls are made when disconnected
    fireEvent.click(screen.getByRole("button", { name: /read/i }));
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

    // Verify the loaded message appears
    await waitFor(() => {
      expect(screen.getByText("✅ Device data loaded")).toBeInTheDocument();
    });

    // Inputs should be enabled
    const samplesInput = screen.getByDisplayValue("100");
    expect(samplesInput).toBeEnabled();

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

    // First, make GETs resolve to avoid interfering with the test
    mockMakeRequest.mockResolvedValue({ data: { success: true } });

    await act(async () => {
      render(<DeviceDataPanel />);
    });

    // Change samples input value
    const samplesInput = screen.queryByLabelText(
      /Samples Amount/i
    ) as HTMLInputElement | null;
    // If label lookup fails (label may not be linked), fall back to first number input (spinbutton)
    const inputToUse = (samplesInput ??
      screen.getAllByRole("spinbutton")[0]) as HTMLInputElement;
    fireEvent.change(inputToUse, { target: { value: "150" } });

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
        screen.getByText(/✅ Samples amount updated/i)
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

    await act(async () => {
      render(<DeviceDataPanel />);
    });

    // Now make the POST fail
    mockMakeRequest.mockRejectedValueOnce(new Error("Network error"));

    // Click first Set button
    const setButtons = screen.getAllByRole("button", { name: /set/i });
    fireEvent.click(setButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("❌ Request failed")).toBeInTheDocument();
    });
  });
});
