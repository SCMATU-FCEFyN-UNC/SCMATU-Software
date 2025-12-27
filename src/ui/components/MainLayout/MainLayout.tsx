/* import { useState, useEffect } from "react"; */
import CommunicationPanel from "../CommunicationPanel/CommunicationPanel";
import DeviceDataPanel from "../DeviceDataPanel/DeviceDataPanel";
import ControlPanel from "../ControlPanel/ControlPanel";
import MonitoringPanel from "../MonitoringPanel/MonitoringPanel";
import "./MainLayout.model.scss";

export function MainLayout() {
  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <h1>Ultrasonic Amplifier Control</h1>
      </header>

      {/* Top bar */}
      <div className="top-bar">
        <div className="top-bar-item">
          <CommunicationPanel />
        </div>

        <div className="top-bar-item">
          <DeviceDataPanel />
        </div>
      </div>

      {/* Main content */}
      <main className="main-content">
        <div className="main-content-container">
          <section className="control-section">
            <ControlPanel />
          </section>

          <section className="monitoring-section">
            <MonitoringPanel />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <span>System ready</span>
        <span className="version">v0.1.0</span>
      </footer>
    </div>
  );
}
