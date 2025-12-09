import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import ControlPanel from "./ControlPanel";
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

describe("ControlPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMakeRequest.mockReset();
    (useBackendRequest as Mock).mockReturnValue({
      makeRequest: mockMakeRequest,
      loading: false,
      error: null,
    });
    // Set default resonance status
    mockUseResonanceStatus.mockReturnValue({
      running: false,
      setRunning: vi.fn(),
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

    it("renders all control fields with initial values", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      expect(screen.getByText("Control Panel")).toBeInTheDocument();
      expect(
        screen.getByText("⚠️ Connect to a device first")
      ).toBeInTheDocument();

      // Check initial values
      expect(screen.getByDisplayValue("60000")).toBeInTheDocument();
      expect(screen.getByDisplayValue("50")).toBeInTheDocument();

      // There are two inputs with display value "100" (On Time and Off Time)
      const hundredInputs = screen.getAllByDisplayValue("100");
      expect(hundredInputs.length).toBeGreaterThanOrEqual(2);

      // Ensure both On Time and Off Time exist via spinbutton positions
      const spinbuttons = screen.getAllByRole("spinbutton");
      expect(spinbuttons[2]).toHaveValue(100);
      expect(spinbuttons[3]).toHaveValue(100);
    });

    it("disables all inputs when disconnected", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const frequencyInput = screen.getByDisplayValue("60000");
      const powerInput = screen.getByDisplayValue("50");
      const spinbuttons = screen.getAllByRole("spinbutton");
      const onTimeInput = spinbuttons[2];
      const offTimeInput = spinbuttons[3];

      expect(frequencyInput).toBeDisabled();
      expect(powerInput).toBeDisabled();
      expect(onTimeInput).toBeDisabled();
      expect(offTimeInput).toBeDisabled();
    });

    it("disables all buttons when disconnected", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const getButton = screen.getByRole("button", { name: /get/i });

      setButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
      expect(getButton).toBeDisabled();
    });

    it("does not make API calls when buttons are clicked while disconnected", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const getButton = screen.getByRole("button", { name: /get/i });

      // Try to click all buttons
      setButtons.forEach((button) => {
        fireEvent.click(button);
      });
      fireEvent.click(getButton);

      // Wait to ensure no API calls are made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockMakeRequest).not.toHaveBeenCalled();
    });

    it("shows warning message when disconnected", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      expect(
        screen.getByText("⚠️ Connect to a device first")
      ).toBeInTheDocument();
    });
  });

  describe("when connected", () => {
    beforeEach(() => {
      mockUseConnection.mockReturnValue({
        connected: true,
        setConnected: vi.fn(),
        selectedPort: "COM3",
        setSelectedPort: vi.fn(),
      });
    });

    it("enables all inputs when connected", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const frequencyInput = screen.getByDisplayValue("60000");
      const powerInput = screen.getByDisplayValue("50");
      const spinbuttons = screen.getAllByRole("spinbutton");
      const onTimeInput = spinbuttons[2];
      const offTimeInput = spinbuttons[3];

      expect(frequencyInput).toBeEnabled();
      expect(powerInput).toBeEnabled();
      expect(onTimeInput).toBeEnabled();
      expect(offTimeInput).toBeEnabled();
    });

    it("enables all buttons when connected", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const getButton = screen.getByRole("button", { name: /get/i });

      setButtons.forEach((button) => {
        expect(button).toBeEnabled();
      });
      expect(getButton).toBeEnabled();
    });

    it("does not show warning message when connected", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      expect(
        screen.queryByText("⚠️ Connect to a device first")
      ).not.toBeInTheDocument();
    });

    it("calls set frequency endpoint when Set Frequency button is clicked", async () => {
      mockMakeRequest.mockResolvedValueOnce({ data: { success: true } });

      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const frequencySetButton = setButtons[0];
      fireEvent.click(frequencySetButton);

      await waitFor(() => {
        expect(mockMakeRequest).toHaveBeenCalledWith("/frequency", {
          method: "POST",
          data: { frequency_hz: 60000 },
        });
      });
      expect(screen.getByText("✅ Frequency updated")).toBeInTheDocument();
    });

    it("calls get frequency endpoint when Get Frequency button is clicked", async () => {
      mockMakeRequest.mockResolvedValueOnce({ data: { frequency: 55000 } });

      await act(async () => {
        render(<ControlPanel />);
      });

      const getButton = screen.getByRole("button", { name: /get/i });
      fireEvent.click(getButton);

      await waitFor(() => {
        expect(mockMakeRequest).toHaveBeenCalledWith("/frequency", {
          method: "GET",
        });
      });
      expect(screen.getByText("Frequency read: 55000 Hz")).toBeInTheDocument();
    });

    it("calls set power endpoint when Set Power button is clicked", async () => {
      mockMakeRequest.mockResolvedValueOnce({ data: { success: true } });

      await act(async () => {
        render(<ControlPanel />);
      });

      const powerInput = screen.getByDisplayValue("50");
      fireEvent.change(powerInput, { target: { value: "75" } });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const powerSetButton = setButtons[1];
      fireEvent.click(powerSetButton);

      await waitFor(() => {
        expect(mockMakeRequest).toHaveBeenCalledWith("/power", {
          method: "POST",
          data: { power_percent: 75 },
        });
      });
      expect(screen.getByText("✅ Power level updated")).toBeInTheDocument();
    });

    it("calls set on time endpoint when Set On Time button is clicked", async () => {
      mockMakeRequest.mockResolvedValueOnce({ data: { success: true } });

      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const onTimeSetButton = setButtons[2];

      await act(async () => {
        fireEvent.click(onTimeSetButton);
      });

      await waitFor(() => {
        expect(mockMakeRequest).toHaveBeenCalledWith("/on_time", {
          method: "POST",
          data: { on_time_ms: 100 },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/✅ On time updated/)).toBeInTheDocument();
      });
    });

    it("calls set off time endpoint when Set Off Time button is clicked", async () => {
      mockMakeRequest.mockResolvedValueOnce({ data: { success: true } });

      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const offTimeSetButton = setButtons[3];
      fireEvent.click(offTimeSetButton);

      await waitFor(() => {
        expect(mockMakeRequest).toHaveBeenCalledWith("/off_time", {
          method: "POST",
          data: { off_time_ms: 100 },
        });
      });
      expect(screen.getByText("✅ Off time updated")).toBeInTheDocument();
    });

    it("displays error message when request fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockMakeRequest.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const frequencySetButton = setButtons[0];
      fireEvent.click(frequencySetButton);

      await waitFor(() => {
        expect(screen.getByText("❌ Request failed")).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Request failed:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("displays error message when backend returns success: false", async () => {
      mockMakeRequest.mockResolvedValueOnce({
        data: {
          success: false,
          error: "Invalid frequency",
        },
      });

      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const frequencySetButton = setButtons[0];
      fireEvent.click(frequencySetButton);

      await waitFor(() => {
        expect(screen.getByText("❌ Invalid frequency")).toBeInTheDocument();
      });
    });

    it("disables buttons when loading", async () => {
      mockMakeRequest.mockImplementation(() => new Promise(() => {})); // Never resolves

      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const frequencySetButton = setButtons[0];
      fireEvent.click(frequencySetButton);

      await waitFor(() => {
        const allButtons = screen.getAllByRole("button");
        allButtons.forEach((button) => {
          expect(button).toBeDisabled();
        });
      });
    });

    it("updates frequency value when input changes", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const frequencyInput = screen.getByDisplayValue("60000");
      fireEvent.change(frequencyInput, { target: { value: "50000" } });

      expect(frequencyInput).toHaveValue(50000);
    });

    it("handles power level boundaries correctly", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const powerInput = screen.getByDisplayValue("50") as HTMLInputElement;

      fireEvent.change(powerInput, { target: { value: "0" } });
      expect(powerInput.value).toBe("0");

      fireEvent.change(powerInput, { target: { value: "100" } });
      expect(powerInput.value).toBe("100");
    });

    it("handles on time minimum value", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const spinbuttons = screen.getAllByRole("spinbutton");
      const onTimeInput = spinbuttons[2] as HTMLInputElement;

      fireEvent.change(onTimeInput, { target: { value: "1" } });
      expect(onTimeInput.value).toBe("1");
    });

    it("handles off time minimum value", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const spinbuttons = screen.getAllByRole("spinbutton");
      const offTimeInput = spinbuttons[3] as HTMLInputElement;

      fireEvent.change(offTimeInput, { target: { value: "1" } });
      expect(offTimeInput.value).toBe("1");
    });

    it("clears previous message when making new request", async () => {
      mockMakeRequest.mockResolvedValue({ data: { success: true } });

      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const frequencySetButton = setButtons[0];

      fireEvent.click(frequencySetButton);
      await waitFor(() => {
        expect(screen.getByText("✅ Frequency updated")).toBeInTheDocument();
      });

      fireEvent.click(frequencySetButton);
      await waitFor(() => {
        expect(screen.getByText("✅ Frequency updated")).toBeInTheDocument();
      });
    });
  });

  describe("when resonance measurement is running", () => {
    beforeEach(() => {
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
    });

    it("disables all inputs when resonance is running", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const frequencyInput = screen.getByDisplayValue("60000");
      const powerInput = screen.getByDisplayValue("50");
      const spinbuttons = screen.getAllByRole("spinbutton");
      const onTimeInput = spinbuttons[2];
      const offTimeInput = spinbuttons[3];

      expect(frequencyInput).toBeDisabled();
      expect(powerInput).toBeDisabled();
      expect(onTimeInput).toBeDisabled();
      expect(offTimeInput).toBeDisabled();
    });

    it("disables all buttons when resonance is running", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const getButton = screen.getByRole("button", { name: /get/i });

      setButtons.forEach((button) => {
        expect(button).toBeDisabled();
      });
      expect(getButton).toBeDisabled();
    });

    it("does not make API calls when buttons are clicked while resonance is running", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const getButton = screen.getByRole("button", { name: /get/i });

      setButtons.forEach((button) => {
        fireEvent.click(button);
      });
      fireEvent.click(getButton);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockMakeRequest).not.toHaveBeenCalled();
    });
  });
});
