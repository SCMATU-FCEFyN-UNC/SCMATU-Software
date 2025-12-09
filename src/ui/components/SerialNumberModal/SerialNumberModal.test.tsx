import { render, screen, fireEvent, act } from "@testing-library/react";
import SerialNumberModal from "./SerialNumberModal";
import { vi, type Mock } from "vitest";
import { useBackendRequest } from "../../utils/backendRequests";

vi.mock("../../utils/backendRequests");

const mockMakeRequest = vi.fn();
const mockUseBackendRequest = useBackendRequest as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mockMakeRequest.mockReset();
  mockUseBackendRequest.mockReturnValue({
    makeRequest: mockMakeRequest,
  });
});

describe("SerialNumberModal", () => {
  it("renders inputs and buttons and calls onClose when Cancel is clicked", async () => {
    const onClose = vi.fn();
    render(
      <SerialNumberModal
        initialSerial="0001"
        onClose={onClose}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText("Update Serial Number")).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/New Serial Number/i)).toBeInTheDocument();
    expect(screen.getByText("Write Serial Number")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error when password is missing", async () => {
    render(<SerialNumberModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByText("Write Serial Number"));

    expect(await screen.findByText("❌ Password required")).toBeInTheDocument();
  });

  it("validates serial contains only digits", async () => {
    render(<SerialNumberModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    // Fill password and invalid serial
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "1234" },
    });
    fireEvent.change(screen.getByLabelText(/New Serial Number/i), {
      target: { value: "ABC" },
    });

    fireEvent.click(screen.getByText("Write Serial Number"));

    expect(
      await screen.findByText("❌ Serial number must contain only numbers")
    ).toBeInTheDocument();

    // serial input should be cleared
    expect(
      (screen.getByLabelText(/New Serial Number/i) as HTMLInputElement).value
    ).toBe("");
  });

  it("validates serial length between 1 and 20", async () => {
    render(<SerialNumberModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "1234" },
    });

    // create a too-long serial (21 digits)
    const longSerial = "1".repeat(21);
    fireEvent.change(screen.getByLabelText(/New Serial Number/i), {
      target: { value: longSerial },
    });

    fireEvent.click(screen.getByText("Write Serial Number"));

    expect(
      await screen.findByText(
        "❌ Serial number must be between 1 and 20 characters"
      )
    ).toBeInTheDocument();

    expect(
      (screen.getByLabelText(/New Serial Number/i) as HTMLInputElement).value
    ).toBe("");
  });

  it("shows error when password write fails", async () => {
    // First call is password write -> return failure
    mockMakeRequest.mockResolvedValueOnce({
      data: { success: false, error: "pw error" },
    });

    render(<SerialNumberModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "1111" },
    });
    fireEvent.change(screen.getByLabelText(/New Serial Number/i), {
      target: { value: "12345" },
    });

    fireEvent.click(screen.getByText("Write Serial Number"));

    expect(
      await screen.findByText(/❌ Failed to write password/i)
    ).toBeInTheDocument();
  });

  it("handles incorrect password status returned by status check", async () => {
    // 1) password write success
    mockMakeRequest.mockResolvedValueOnce({
      data: { success: true },
    });
    // 2) statusBefore -> status 2 (incorrect password)
    mockMakeRequest.mockResolvedValueOnce({
      data: { status: 2 },
    });

    render(<SerialNumberModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "2222" },
    });
    fireEvent.change(screen.getByLabelText(/New Serial Number/i), {
      target: { value: "98765" },
    });

    fireEvent.click(screen.getByText("Write Serial Number"));

    expect(
      await screen.findByText("❌ Incorrect password")
    ).toBeInTheDocument();

    // Ensure the two expected calls were made
    expect(mockMakeRequest).toHaveBeenNthCalledWith(
      1,
      "/serial_number_password",
      {
        method: "POST",
        data: { password: Number("2222") },
      }
    );
    expect(mockMakeRequest).toHaveBeenNthCalledWith(
      2,
      "/serial_number_status",
      {
        method: "GET",
      }
    );
  });

  it("handles write attempt failure and reads status for reason", async () => {
    // 1) password write success
    mockMakeRequest.mockResolvedValueOnce({ data: { success: true } });
    // 2) statusBefore -> ok (0)
    mockMakeRequest.mockResolvedValueOnce({ data: { status: 0 } });
    // 3) writeResp -> returns success: false
    mockMakeRequest.mockResolvedValueOnce({ data: { success: false } });
    // 4) statusAfterAttempt -> returns status code 3 (Write Not Authorized)
    mockMakeRequest.mockResolvedValueOnce({ data: { status: 3 } });

    render(<SerialNumberModal onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "3333" },
    });
    fireEvent.change(screen.getByLabelText(/New Serial Number/i), {
      target: { value: "55555" },
    });

    fireEvent.click(screen.getByText("Write Serial Number"));

    expect(
      await screen.findByText(/❌ Write attempt failed: Write Not Authorized/)
    ).toBeInTheDocument();

    // verify endpoints called in order
    expect(mockMakeRequest).toHaveBeenNthCalledWith(
      1,
      "/serial_number_password",
      {
        method: "POST",
        data: { password: Number("3333") },
      }
    );
    expect(mockMakeRequest).toHaveBeenNthCalledWith(
      2,
      "/serial_number_status",
      {
        method: "GET",
      }
    );
    expect(mockMakeRequest).toHaveBeenNthCalledWith(3, "/serial_number", {
      method: "POST",
      data: { serial_number: "55555" },
    });
    expect(mockMakeRequest).toHaveBeenNthCalledWith(
      4,
      "/serial_number_status",
      {
        method: "GET",
      }
    );
  });

  it("performs full successful write flow and calls onSuccess and onClose after timeout", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    mockMakeRequest
      .mockResolvedValueOnce({ data: { success: true } }) // pw write
      .mockResolvedValueOnce({ data: { status: 0 } }) // statusBefore
      .mockResolvedValueOnce({ data: { success: true } }) // writeResp
      .mockResolvedValueOnce({ data: { status: 1 } }); // statusAfter

    render(
      <SerialNumberModal
        initialSerial="42"
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "4444" },
    });
    fireEvent.change(screen.getByLabelText(/New Serial Number/i), {
      target: { value: "424242" },
    });

    fireEvent.click(screen.getByText("Write Serial Number"));

    // Wait for success message to appear
    expect(
      await screen.findByText("✅ Serial number written successfully")
    ).toBeInTheDocument();

    // onSuccess should have been called
    expect(onSuccess).toHaveBeenCalled();

    // Wait real time for the component's 700ms close timer to run
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
    });

    expect(onClose).toHaveBeenCalled();
  }, 10000);
});
