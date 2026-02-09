import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
  Customized,
} from "recharts";
import "./PowerTrianglePlot.model.scss";

interface PowerTrianglePlotProps {
  voltage: number | null;
  current: number | null;
  phaseDegrees: number | null;
  power?: number | null; // optional real power (W) or VA depending on backend
}

const formatNumber = (v: number, decimals = 2) => v.toFixed(decimals);

const PowerTrianglePlot: React.FC<PowerTrianglePlotProps> = ({
  voltage,
  current,
  phaseDegrees,
  power,
}) => {
  // Compute apparent power S (VA) from V and I when available
  const S = useMemo(() => {
    if (voltage == null || current == null) return null;
    return voltage * current;
  }, [voltage, current]);

  // Compute P and Q from S and phase
  const { P, Q, phi } = useMemo(() => {
    if (S == null) return { P: null, Q: null, phi: null };

    let p, q, phiRad;

    if (phaseDegrees != null) {
      phiRad = (phaseDegrees * Math.PI) / 180;
      p = S * Math.cos(phiRad);
      q = S * Math.sin(phiRad);
    } else if (power != null) {
      p = power;
      q = 0;
      phiRad = null;
    } else {
      return { P: null, Q: null, phi: null };
    }

    return { P: p, Q: q, phi: phiRad };
  }, [S, phaseDegrees, power]);

  const effectiveP = P;
  const effectiveQ = Q;

  const hasData = S != null && (phaseDegrees != null || power != null);

  if (!hasData) {
    return null;
  }

  // Colors
  const P_COLOR = "#7b68ee"; // real (P)
  const S_COLOR = "#ff7300"; // apparent (S)
  const Q_COLOR = "#d9534f"; // reactive (Q) - red

  // Prepare scaled values for display (milli-units)
  const S_magnitude = Math.abs(S);
  const effectiveP_mW = effectiveP != null ? effectiveP * 1000 : null;
  const effectiveQ_mVAR = effectiveQ != null ? effectiveQ * 1000 : 0;

  // Verify the Pythagorean relationship: S² = P² + Q²
  const calculatedS =
    effectiveP != null && effectiveQ != null
      ? Math.sqrt(effectiveP * effectiveP + effectiveQ * effectiveQ)
      : S_magnitude;

  const horizontalLineData = [
    { x: 0, y: 0 },
    { x: effectiveP_mW as number, y: 0 },
  ];

  const verticalQLineData = [
    { x: effectiveP_mW as number, y: 0 },
    { x: effectiveP_mW as number, y: effectiveQ_mVAR as number },
  ];

  const hypotenuseLineData = [
    { x: 0, y: 0 },
    { x: effectiveP_mW as number, y: effectiveQ_mVAR as number },
  ];

  // Calculate axis ranges for square plot with equal scaling
  const paddingFactor = 1.2; // 20% padding on each side

  // Find the maximum absolute value between P and Q
  const maxP = Math.abs(effectiveP_mW ?? 0);
  const maxQ = Math.abs(effectiveQ_mVAR ?? 0);
  const maxAbsValue = Math.max(maxP, maxQ);

  // If both are very small, set a minimum range
  const minRange = 0.001;
  const baseRange = Math.max(maxAbsValue * paddingFactor, minRange);

  // For square plot: X goes from 0 to 2.4×max, Y goes from -1.2×max to +1.2×max
  // This gives us a square where the visible area is centered on the data
  const xRange = baseRange * 1.5; // 0 to 2.4×baseRange
  const yRange = baseRange * 2; // -baseRange to +baseRange

  // Calculate domain with additional padding for the square
  const xDomain = [0, xRange];
  const yDomain = [-baseRange, baseRange]; // Symmetric around 0

  // Calculate tick values for both axes to ensure equal scaling
  // We want the same number of divisions on both axes
  const tickCount = 6;

  // Calculate tick values for X axis (0 to xRange)
  const calculateXTicks = () => {
    const ticks = [];
    for (let i = 0; i <= tickCount; i++) {
      ticks.push((i * xRange) / tickCount);
    }
    return ticks;
  };

  // Calculate tick values for Y axis (-baseRange to baseRange)
  const calculateYTicks = () => {
    const ticks = [];
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(-baseRange + (i * yRange) / tickCount);
    }
    return ticks;
  };

  // Usable power percentage: how much of S is real P (|P|/S)
  const percentUsable =
    effectiveP != null ? (Math.abs(effectiveP) / calculatedS) * 100 : null;

  // Display S calculated from P and Q to ensure consistency
  const displayS_mVA = calculatedS * 1000;

  // Customize angle arc overlay
  const renderAngleArc = (props: any) => {
    const { xAxisMap, yAxisMap } = props;
    if (!phi || !xAxisMap || !yAxisMap) return null;

    const xScale = xAxisMap[0].scale;
    const yScale = yAxisMap[0].scale;
    if (!xScale || !yScale) return null;

    const cx = xScale(0);
    const cy = yScale(0);

    // Calculate radius as 25% of the apparent power
    const radiusData = calculatedS * 1000 * 0.25;

    // Convert radius to pixels using both scales to ensure proper positioning
    const xRadiusPx = Math.abs(xScale(radiusData) - cx);
    const yRadiusPx = Math.abs(yScale(radiusData) - cy);
    const rPx = Math.min(xRadiusPx, yRadiusPx);
    const r = Math.max(16, rPx || 24);

    const startX = cx + r;
    const startY = cy;
    const endX = cx + r * Math.cos(phi);
    const endY = cy - r * Math.sin(phi);

    const largeArcFlag = Math.abs(phi) > Math.PI ? 1 : 0;
    const sweepFlag = phi >= 0 ? 1 : 0;

    const path = `M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY} Z`;

    const labelX = cx + (r + 12) * Math.cos(phi / 2);
    const labelY = cy - (r + 12) * Math.sin(phi / 2);

    return (
      <g>
        <path
          d={path}
          fill="rgba(136,132,216,0.12)"
          stroke="#8884d8"
          strokeWidth={1}
        />
        <text
          x={labelX}
          y={labelY}
          fill="#444"
          fontSize={12}
          textAnchor="middle"
        >
          {`${(phaseDegrees ?? 0).toFixed(2)}°`}
        </text>
      </g>
    );
  };

  // Custom axis tick component to ensure consistent formatting
  const renderAxisTick = ({ x, y, payload, axisType }: any) => {
    const value = Number(payload.value);
    let formattedValue;

    if (axisType === "x") {
      formattedValue = value.toFixed(2);
    } else {
      formattedValue = value.toFixed(3);
    }

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={axisType === "x" ? 16 : -8}
          textAnchor="middle"
          fill="#666"
          fontSize={11}
        >
          {formattedValue}
        </text>
      </g>
    );
  };

  return (
    <div className="power-triangle-container">
      <div className="plot-header">
        <h3>Power Triangle</h3>
        <div className="stats">
          <div className="stat">
            <span className="label">Apparent (S)</span>
            <span className="value">{formatNumber(displayS_mVA, 3)} mVA</span>
          </div>
          <div className="stat">
            <span className="label">Real (P)</span>
            <span className="value">
              {effectiveP_mW != null
                ? formatNumber(effectiveP_mW as number, 3)
                : "-"}{" "}
              mW
            </span>
          </div>
          <div className="stat">
            <span className="label">Reactive (Q)</span>
            <span className="value">
              {effectiveQ_mVAR != null
                ? formatNumber(effectiveQ_mVAR as number, 3)
                : "-"}{" "}
              mVAR
            </span>
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width={300} height={300}>
          <LineChart
            data={hypotenuseLineData}
            margin={{ top: 10, right: 10, left: 30, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />

            {/* X Axis with equal scaling */}
            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain}
              ticks={calculateXTicks()}
              tick={(props) => renderAxisTick({ ...props, axisType: "x" })}
              label={{
                value: "P (mW)",
                position: "insideBottom",
                offset: -8,
                style: { fill: "#888", fontSize: 12 },
              }}
              axisLine={{ stroke: "#666" }}
              tickLine={{ stroke: "#666" }}
            />

            {/* Y Axis with equal scaling */}
            <YAxis
              type="number"
              dataKey="y"
              domain={yDomain}
              ticks={calculateYTicks()}
              tick={(props) => renderAxisTick({ ...props, axisType: "y" })}
              label={{
                value: "Q (mVAR)",
                angle: -90,
                position: "insideLeft",
                offset: -5,
                style: { fill: Q_COLOR, fontSize: 12 },
              }}
              axisLine={{ stroke: "#666" }}
              tickLine={{ stroke: "#666" }}
            />

            {/* Horizontal P line */}
            <Line
              name="P"
              data={horizontalLineData}
              type="linear"
              dataKey="y"
              stroke={P_COLOR}
              strokeWidth={2}
              dot={false}
            />

            {/* Vertical Q line */}
            <Line
              name="Q"
              data={verticalQLineData}
              type="linear"
              dataKey="y"
              stroke={Q_COLOR}
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 2"
            />

            {/* Hypotenuse S (apparent) */}
            <Line
              name="S"
              data={hypotenuseLineData}
              type="linear"
              dataKey="y"
              stroke={S_COLOR}
              strokeWidth={2}
              dot={false}
            />

            {/* Reference lines - thicker for visibility */}
            <ReferenceLine x={0} stroke="#666" strokeWidth={1.5} />
            <ReferenceLine y={0} stroke="#666" strokeWidth={1.5} />

            {/* Dots for points */}
            <ReferenceDot
              x={0}
              y={0}
              r={3}
              fill="#333"
              label={{ position: "top", value: "O" }}
            />
            <ReferenceDot
              x={effectiveP_mW as number}
              y={0}
              r={5}
              fill={P_COLOR}
            />
            <ReferenceDot
              x={effectiveP_mW as number}
              y={effectiveQ_mVAR as number}
              r={5}
              fill={S_COLOR}
            />

            {/* Custom tooltip */}
            <Tooltip
              content={({ active, payload, label }: any) => {
                if (!active) return null;
                const pVal = label != null ? Number(label).toFixed(3) : "-";
                let qVal: number | null = null;
                if (payload && payload.length) {
                  const qEntry = payload.find(
                    (e: any) => e && (e.name === "Q" || e.name === "S"),
                  );
                  if (qEntry && qEntry.value != null)
                    qVal = Number(qEntry.value);
                }

                return (
                  <div
                    className="custom-tooltip"
                    style={{
                      background: "#fff",
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  >
                    <div>
                      <strong>P:</strong> {pVal} mW
                    </div>
                    <div>
                      <strong>Q:</strong>{" "}
                      {qVal != null ? qVal.toFixed(3) + " mVAR" : "-"}
                    </div>
                  </div>
                );
              }}
            />

            {phi && <Customized component={renderAngleArc} />}

            <Customized
              component={(props: any) => {
                const { xAxisMap, yAxisMap } = props;
                if (!xAxisMap || !yAxisMap || effectiveP_mW == null)
                  return null;
                const xScale = xAxisMap[0].scale;
                const yScale = yAxisMap[0].scale;
                if (!xScale || !yScale) return null;

                const px0 = xScale(0);
                const px1 = xScale(effectiveP_mW as number);
                const py = yScale(0);
                const pMidX = (px0 + px1) / 2;
                const pMidY = py - 8;

                const sx0 = xScale(0);
                const sx1 = xScale(effectiveP_mW as number);
                const sy0 = yScale(0);
                const sy1 = yScale(effectiveQ_mVAR as number);
                const sMidX = (sx0 + sx1) / 2;
                const sMidY = (sy0 + sy1) / 2;

                const qLabelX = px1 + 8;
                const qLabelY = (yScale(effectiveQ_mVAR as number) + py) / 2;

                return (
                  <g>
                    <text
                      x={pMidX}
                      y={pMidY}
                      fill={P_COLOR}
                      fontSize={11}
                      textAnchor="middle"
                    >{`P ${effectiveP_mW.toFixed(3)} mW`}</text>
                    <text
                      x={sMidX}
                      y={sMidY}
                      fill={S_COLOR}
                      fontSize={11}
                      textAnchor="middle"
                    >{`S ${displayS_mVA.toFixed(3)} mVA`}</text>
                    <text
                      x={qLabelX}
                      y={qLabelY}
                      fill={Q_COLOR}
                      fontSize={11}
                      textAnchor="start"
                    >{`Q ${effectiveQ_mVAR.toFixed(3)} mVAR`}</text>
                  </g>
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="plot-footer">
        <div className="legend">
          <div className="legend-item">
            <span className="swatch" style={{ background: P_COLOR }} /> P (real)
          </div>
          <div className="legend-item">
            <span className="swatch" style={{ background: S_COLOR }} /> S
            (apparent)
          </div>
          <div className="legend-item">
            <span className="swatch" style={{ background: Q_COLOR }} /> Q
            (reactive)
          </div>
        </div>

        <div>
          <span className="value">Usable (%)</span>
          <span className="value">
            {percentUsable != null ? percentUsable.toFixed(1) + "%" : "—"}
          </span>
        </div>
      </div>
      <span className="value">
        Usable = |P| / S × 100 (percentage of apparent power that is real).
        Calculation uses base units (W and VA); displayed values are converted
        to mW/mVA/mVAR.
      </span>
    </div>
  );
};

export default PowerTrianglePlot;
