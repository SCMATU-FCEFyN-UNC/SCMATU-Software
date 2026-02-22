import { render, screen, within } from "@testing-library/react";
import PowerTrianglePlot from "./PowerTrianglePlot";

describe("PowerTrianglePlot", () => {
  it("does not render when missing data", () => {
    const { container } = render(
      <PowerTrianglePlot voltage={null} current={null} phaseDegrees={null} />,
    );
    // component returns null when insufficient data
    expect(container).toBeEmptyDOMElement();
  });

  it("renders stats and usable percent when voltage, current and phase present", () => {
    const voltage = 230; // V
    const current = 2; // A
    const phaseDegrees = 30; // degrees

    render(
      <PowerTrianglePlot
        voltage={voltage}
        current={current}
        phaseDegrees={phaseDegrees}
      />,
    );

    // Header
    expect(screen.getByText(/Power Triangle/i)).toBeInTheDocument();

    // Calculate expected values using same logic as component
    const S = voltage * current; // VA
    const phi = (phaseDegrees * Math.PI) / 180;
    const P = S * Math.cos(phi);
    const Q = S * Math.sin(phi);

    const displayS_mVA = (Math.sqrt(P * P + Q * Q) * 1000).toFixed(3);
    const expectedP_mW = (P * 1000).toFixed(3);
    const expectedQ_mVAR = (Q * 1000).toFixed(3);
    const expectedPercent = (Math.abs(Math.cos(phi)) * 100).toFixed(3) + "%";

    // Apparent (S)
    expect(screen.getByText(new RegExp(displayS_mVA))).toBeInTheDocument();

    // Real (P) and Reactive (Q)
    expect(screen.getByText(new RegExp(expectedP_mW))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(expectedQ_mVAR))).toBeInTheDocument();

    // Usable percent
    expect(screen.getByText(new RegExp(expectedPercent))).toBeInTheDocument();
  });

  it("uses explicit power when phaseDegrees is null", () => {
    const voltage = 230;
    const current = 2;
    const power = 150; // W - explicit real power

    render(
      <PowerTrianglePlot
        voltage={voltage}
        current={current}
        phaseDegrees={null}
        power={power}
      />,
    );

    // When phaseDegrees is null and power provided, component uses power as P
    const displayS_mVA = (Math.abs(power) * 1000).toFixed(3);
    const expectedP_mW = (power * 1000).toFixed(3);

    // Target the specific stat containers to avoid ambiguous matches
    const apparentLabel = screen.getByText("Apparent (S)");
    const apparentStat = apparentLabel.closest(".stat") as HTMLElement | null;
    expect(apparentStat).not.toBeNull();
    expect(
      within(apparentStat!).getByText(new RegExp(displayS_mVA)),
    ).toBeInTheDocument();

    const realLabel = screen.getByText("Real (P)");
    const realStat = realLabel.closest(".stat") as HTMLElement | null;
    expect(realStat).not.toBeNull();
    expect(
      within(realStat!).getByText(new RegExp(expectedP_mW)),
    ).toBeInTheDocument();
  });
});
