import React from "react";
import SignalPlot from "../SignalPlot/SignalPlot";
import PowerTrianglePlot from "../PowerTrianglePlot/PowerTrianglePlot";
import "./MagnitudePlots.model.scss";

/* interface PhaseData {
  seconds: number;
  degrees: number;
}
 */
interface MagnitudePlotsProps {
  voltage: number | null;
  current: number | null;
  phaseSeconds: number | null;
  phaseDegrees: number | null;
  period: number | null;
  power: number | null;
}

const MagnitudePlots: React.FC<MagnitudePlotsProps> = ({
  voltage,
  current,
  phaseSeconds,
  phaseDegrees,
  period,
  power,
}) => {
  // Check if we have enough data to show SignalPlot
  const hasSignalPlotData =
    voltage !== null && current !== null && period !== null && period > 0;

  // Check if we have enough data to show PowerTriangle
  const hasPowerTriangleData =
    voltage !== null &&
    current !== null &&
    (phaseDegrees !== null || power !== null);

  // Check if we have any plot data at all
  const hasAnyPlotData = hasSignalPlotData || hasPowerTriangleData;

  if (!hasAnyPlotData) {
    return (
      <div className="magnitude-plots-container">
        <div className="plots-placeholder">
          <p className="placeholder-title">No plot data available</p>
          <p className="placeholder-message">
            Refresh monitoring data to view voltage/current plots and power
            triangle
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="magnitude-plots-container">
      <div className="plots-grid">
        {hasSignalPlotData && (
          <div className="plot-item signal-plot">
            <SignalPlot
              voltage={voltage}
              current={current}
              phaseSeconds={phaseSeconds}
              phaseDegrees={phaseDegrees}
              period={period}
            />
          </div>
        )}

        {hasPowerTriangleData && (
          <div className="plot-item power-triangle">
            <PowerTrianglePlot
              voltage={voltage}
              current={current}
              phaseDegrees={phaseDegrees}
              power={power}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MagnitudePlots;
