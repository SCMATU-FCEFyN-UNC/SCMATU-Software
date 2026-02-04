import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface SignalDataPoint {
  time: number; // Time in microseconds
  voltage: number; // in volts
  current: number; // in milliamperes
}

interface SignalPlotProps {
  voltage: number | null;
  current: number | null;
  phaseSeconds: number | null;
  phaseDegrees: number | null;
  period: number | null;
}

const SignalPlot: React.FC<SignalPlotProps> = ({
  voltage,
  current,
  phaseSeconds,
  phaseDegrees,
  period,
}) => {
  // Generate sinusoidal data points for exactly 1.5 cycles (three half cycles)
  const signalData = useMemo((): SignalDataPoint[] => {
    if (!voltage || !current || !period || period <= 0) {
      return [];
    }

    const cyclesToPlot = 1.5; // Three half cycles
    const totalTime = cyclesToPlot * period; // Total plot duration in seconds
    const dataPoints = 200; // Number of points to plot for smooth curve
    const data: SignalDataPoint[] = [];

    for (let i = 0; i <= dataPoints; i++) {
      const time = (i / dataPoints) * totalTime; // Time in seconds

      // Voltage signal: V(t) = V_peak * sin(2π * t / T)
      const voltageValue = voltage * Math.sin((2 * Math.PI * time) / period);

      // Current signal: I(t) = I_peak * sin(2π * (t - Δt) / T)
      // Convert phase from seconds to phase shift in radians
      const phaseShift = phaseSeconds || 0;
      const currentTime = time - phaseShift;
      // Current in milliamperes
      const currentValue =
        current * 1000 * Math.sin((2 * Math.PI * currentTime) / period);

      data.push({
        time: time * 1e6, // Convert to microseconds for display
        voltage: voltageValue,
        current: currentValue,
      });
    }

    return data;
  }, [voltage, current, phaseSeconds, period]);

  // Generate custom X-axis ticks at T/4 intervals for 1.5 cycles
  const xAxisTicks = useMemo(() => {
    if (!period) return [];

    const ticks = [];
    const periodMicro = period * 1e6;

    // Generate 7 ticks at T/4 intervals: 0, T/4, T/2, 3T/4, T, 5T/4, 3T/2
    for (let i = 0; i <= 6; i++) {
      const t = (i / 4) * periodMicro;
      ticks.push(t);
    }

    return ticks;
  }, [period]);

  // Create custom tick renderer to ensure all ticks are shown
  const renderCustomAxisTick = ({ x, y, payload }: any) => {
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="#888" fontSize={12}>
          {payload.value.toFixed(1)}
        </text>
      </g>
    );
  };

  // Determine which signal leads
  const getPhaseRelationship = (): string => {
    if (!phaseSeconds) return "";
    if (phaseSeconds === 0) return "In Phase";
    if (phaseSeconds < 0) return "Current Leads Voltage";
    return "Voltage Leads Current";
  };

  // Format phase information for display
  const phaseInfo = useMemo(() => {
    if (!phaseSeconds && !phaseDegrees) return null;

    const relationship = getPhaseRelationship();
    const phaseAbsSeconds = phaseSeconds ? Math.abs(phaseSeconds) : 0;

    // Convert to appropriate unit for display
    let phaseValue = phaseAbsSeconds;
    let phaseUnit = "s";

    if (phaseAbsSeconds < 1e-6) {
      phaseValue = phaseAbsSeconds * 1e9;
      phaseUnit = "ns";
    } else if (phaseAbsSeconds < 1e-3) {
      phaseValue = phaseAbsSeconds * 1e6;
      phaseUnit = "µs";
    } else if (phaseAbsSeconds < 1) {
      phaseValue = phaseAbsSeconds * 1e3;
      phaseUnit = "ms";
    }

    return {
      relationship,
      timeValue: phaseValue.toFixed(2),
      timeUnit: phaseUnit,
      angleValue: phaseDegrees?.toFixed(2) || "0",
    };
  }, [phaseSeconds, phaseDegrees]);

  if (
    !voltage ||
    !current ||
    !period ||
    period <= 0 ||
    signalData.length === 0
  ) {
    return (
      <div className="signal-plot-container">
        <div className="plot-placeholder">
          <p>No signal data available</p>
          <p>Refresh monitoring data to view plots</p>
        </div>
      </div>
    );
  }

  // Calculate key statistics
  const frequency = 1 / period;
  const powerVA = voltage * current;

  return (
    <div className="signal-plot-container">
      <div className="plot-header">
        <h3>Voltage & Current Signals</h3>
        <div className="signal-info">
          <div className="signal-legend">
            <span className="voltage-indicator">
              Voltage: {voltage.toFixed(3)} V
            </span>
            <span className="current-indicator">
              Current: {(current * 1000).toFixed(2)} mA
            </span>
          </div>
          {phaseInfo && (
            <div className="phase-info">
              <span className="phase-relationship">
                {phaseInfo.relationship}
              </span>
              <span className="phase-details">
                Δt: {phaseInfo.timeValue} {phaseInfo.timeUnit} (
                {phaseInfo.angleValue}°)
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="plot-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={signalData}
            margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis
              dataKey="time"
              ticks={xAxisTicks}
              tick={renderCustomAxisTick}
              interval={0}
              minTickGap={5} // Reduced gap to fit more ticks
              label={{
                value: "Time (µs)",
                position: "insideBottom",
                offset: -5,
                style: { fill: "#888" },
              }}
              stroke="#888"
              domain={[0, 1.5 * period * 1e6]}
            />
            <YAxis
              yAxisId="left"
              tick={false}
              label={{
                value: "Voltage",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#8884d8" },
              }}
              stroke="#8884d8"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={false}
              label={{
                value: "Current",
                angle: 90,
                position: "insideRight",
                style: { fill: "#ff7300" },
              }}
              stroke="#ff7300"
            />
            <Tooltip
              formatter={(value, name) => {
                if (value === undefined || name === undefined) {
                  return ["", ""];
                }

                const signalName =
                  typeof name === "string"
                    ? name.charAt(0).toUpperCase() + name.slice(1)
                    : "Unknown";

                const unit = name === "Voltage" ? "V" : "mA";
                const formattedValue =
                  typeof value === "number"
                    ? value.toFixed(4)
                    : Number(value).toFixed(4);

                return [`${formattedValue} ${unit}`, signalName];
              }}
              labelFormatter={(label) => {
                if (label === undefined) return "";
                return `Time: ${Number(label).toFixed(2)} µs`;
              }}
            />
            <Legend />

            {/* Voltage signal - blue */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="voltage"
              name="Voltage"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />

            {/* Current signal - orange */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="current"
              name="Current"
              stroke="#ff7300"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />

            {/* Zero reference lines */}
            <ReferenceLine y={0} yAxisId="left" stroke="#666" strokeWidth={1} />
            <ReferenceLine
              y={0}
              yAxisId="right"
              stroke="#666"
              strokeWidth={1}
            />

            {/* Vertical reference lines at key time points */}
            {xAxisTicks.map((tick, index) => (
              <ReferenceLine
                key={index}
                x={tick}
                stroke="#555"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="plot-footer">
        <div className="signal-stats">
          <div className="stat-item">
            <span className="stat-label">Frequency:</span>
            <span className="stat-value">{frequency.toFixed(2)} Hz</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Period:</span>
            <span className="stat-value">{(period * 1e6).toFixed(2)} µs</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Apparent Power:</span>
            <span className="stat-value">{powerVA.toFixed(4)} VA</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Phase Shift:</span>
            <span className="stat-value">
              {phaseDegrees?.toFixed(2) || "0.00"}°
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalPlot;
