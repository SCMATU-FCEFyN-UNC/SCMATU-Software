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

vi.mock("../../utils/backendRequests");
vi.mock("../../context/ConnectionStatusProvider");

const mockUseConnection = useConnection as Mock;
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
      expect(screen.getByDisplayValue("100")).toBeInTheDocument();
      expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    });

    it("disables all inputs when disconnected", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const frequencyInput = screen.getByDisplayValue("60000");
      const powerInput = screen.getByDisplayValue("50");
      const samplesInput = screen.getByDisplayValue("100");
      const stepInput = screen.getByDisplayValue("10");

      expect(frequencyInput).toBeDisabled();
      expect(powerInput).toBeDisabled();
      expect(samplesInput).toBeDisabled();
      expect(stepInput).toBeDisabled();
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
      const samplesInput = screen.getByDisplayValue("100");
      const stepInput = screen.getByDisplayValue("10");

      expect(frequencyInput).toBeEnabled();
      expect(powerInput).toBeEnabled();
      expect(samplesInput).toBeEnabled();
      expect(stepInput).toBeEnabled();
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

    it("calls set samples endpoint when Set Samples button is clicked", async () => {
      mockMakeRequest.mockResolvedValueOnce({ data: { success: true } });

      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const samplesSetButton = setButtons[2];

      await act(async () => {
        fireEvent.click(samplesSetButton);
      });

      await waitFor(() => {
        expect(mockMakeRequest).toHaveBeenCalledWith("/samples", {
          method: "POST",
          data: { sample_count: 100 },
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/✅ Sample count updated/)).toBeInTheDocument();
      });
    });

    it("calls set frequency step endpoint when Set Step button is clicked", async () => {
      mockMakeRequest.mockResolvedValueOnce({ data: { success: true } });

      await act(async () => {
        render(<ControlPanel />);
      });

      const setButtons = screen.getAllByRole("button", { name: /set/i });
      const stepSetButton = setButtons[3];
      fireEvent.click(stepSetButton);

      await waitFor(() => {
        expect(mockMakeRequest).toHaveBeenCalledWith("/frequency-step", {
          method: "POST",
          data: { step_hz: 10 },
        });
      });
      expect(screen.getByText("✅ Frequency step updated")).toBeInTheDocument();
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

    it("handles sample count minimum value", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const samplesInput = screen.getByDisplayValue("100") as HTMLInputElement;

      fireEvent.change(samplesInput, { target: { value: "1" } });
      expect(samplesInput.value).toBe("1");
    });

    it("handles frequency step minimum value", async () => {
      await act(async () => {
        render(<ControlPanel />);
      });

      const stepInput = screen.getByDisplayValue("10") as HTMLInputElement;

      fireEvent.change(stepInput, { target: { value: "1" } });
      expect(stepInput.value).toBe("1");
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
});
