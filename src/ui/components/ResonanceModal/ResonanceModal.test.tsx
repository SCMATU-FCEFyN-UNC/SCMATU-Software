import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import ResonanceModal from "./ResonanceModal";
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
const mockOnClose = vi.fn();

describe("ResonanceModal", () => {
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
    });
    mockUseResonanceStatus.mockReturnValue({
      running: false,
      setRunning: vi.fn(),
      statusText: "",
      setStatusText: vi.fn(),
    });
  });

  it("renders with initial values", async () => {
    await act(async () => {
      render(<ResonanceModal onClose={mockOnClose} />);
    });

    expect(screen.getByText("Resonance Measurement")).toBeInTheDocument();
    expect(screen.getByDisplayValue("20000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("140000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  });

  it("handles start measurement successfully", async () => {
    const mockSetRunning = vi.fn();
    const mockSetStatusText = vi.fn();

    mockUseResonanceStatus.mockReturnValue({
      running: false,
      setRunning: mockSetRunning,
      statusText: "",
      setStatusText: mockSetStatusText,
    });

    mockMakeRequest
      .mockResolvedValueOnce({ data: { success: true } }) // start
      .mockResolvedValueOnce({ data: { success: true } }) // end
      .mockResolvedValueOnce({ data: { success: true } }) // step
      .mockResolvedValueOnce({ data: { success: true } }); // start measurement

    await act(async () => {
      render(<ResonanceModal onClose={mockOnClose} />);
    });

    const startButton = screen.getByText("Start Measurement");
    await act(async () => {
      fireEvent.click(startButton);
    });

    expect(mockSetRunning).toHaveBeenCalledWith(true);
    expect(mockSetStatusText).toHaveBeenCalledWith(
      "Measurement in progress..."
    );
    expect(mockMakeRequest).toHaveBeenCalledTimes(4);
  });

  it("disables inputs and buttons while measurement is running", async () => {
    mockUseResonanceStatus.mockReturnValue({
      running: true,
      setRunning: vi.fn(),
      statusText: "Measurement in progress...",
      setStatusText: vi.fn(),
    });

    await act(async () => {
      render(<ResonanceModal onClose={mockOnClose} />);
    });

    const inputs = screen.getAllByRole("spinbutton");
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });

    const startButton = screen.getByText("Start Measurement");
    const closeButton = screen.getByText("Close");

    expect(startButton).toBeDisabled();
    expect(closeButton).toBeDisabled();
  });

  it("shows loading indicator during measurement", async () => {
    mockUseResonanceStatus.mockReturnValue({
      running: true,
      setRunning: vi.fn(),
      statusText: "Measurement in progress...",
      setStatusText: vi.fn(),
    });

    await act(async () => {
      render(<ResonanceModal onClose={mockOnClose} />);
    });

    expect(
      screen.getByText(/this process may take several minutes/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("handles measurement failure", async () => {
    const mockSetRunning = vi.fn();
    const mockSetStatusText = vi.fn();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockUseResonanceStatus.mockReturnValue({
      running: false,
      setRunning: mockSetRunning,
      statusText: "",
      setStatusText: mockSetStatusText,
    });

    mockMakeRequest.mockRejectedValueOnce(new Error("Test error"));

    await act(async () => {
      render(<ResonanceModal onClose={mockOnClose} />);
    });

    const startButton = screen.getByText("Start Measurement");

    await act(async () => {
      await fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(mockSetStatusText).toHaveBeenCalledWith(
        "Error starting measurement"
      );
      expect(mockSetRunning).toHaveBeenCalledWith(false);
      expect(console.error).toHaveBeenCalledWith("Error:", expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it("updates input values correctly", async () => {
    await act(async () => {
      render(<ResonanceModal onClose={mockOnClose} />);
    });

    // Use getByRole with name option instead of getByLabelText
    const startInput = screen.getByRole("spinbutton", {
      name: /frequency range start/i,
    });
    const endInput = screen.getByRole("spinbutton", {
      name: /frequency range end/i,
    });
    const stepInput = screen.getByRole("spinbutton", {
      name: /frequency step/i,
    });

    await act(async () => {
      fireEvent.change(startInput, { target: { value: "30000" } });
      fireEvent.change(endInput, { target: { value: "150000" } });
      fireEvent.change(stepInput, { target: { value: "20" } });
    });

    expect(startInput).toHaveValue(30000);
    expect(endInput).toHaveValue(150000);
    expect(stepInput).toHaveValue(20);
  });

  it("calls onClose when close button is clicked", async () => {
    await act(async () => {
      render(<ResonanceModal onClose={mockOnClose} />);
    });

    const closeButton = screen.getByText("Close");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
