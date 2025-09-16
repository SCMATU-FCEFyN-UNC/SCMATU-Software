# Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose
The purpose of this application is to provide a user-friendly desktop interface for controlling an ultrasonic transducer system used for algal decantation experiments.  
The application will allow researchers to configure excitation parameters, run frequency sweeps to determine resonance, and monitor phase and other measurements in real time.

### 1.2 Scope
This repository contains the software portion of the system:
- **Frontend**: Electron desktop application (React + TypeScript + Vite)
- **Backend**: Python service communicating with hardware (microcontroller based monitoring and control system) via modbus

The application will:
- Allow configuration of frequency and amplitude.
- Display real-time measurements (phase, current, voltage).
- Help find resonance frequency by performing automated sweeps.
- Save results for later analysis.
- Provide a clean and robust interface.

---

## 2. Functional Requirements

### 2.1 Configuration & Control
- **FR-1**: The user shall be able to set the excitation frequency manually.
- **FR-2**: The user shall be able to define frequency sweep parameters:
  - Start frequency, stop frequency, step size.
- **FR-3**: The system shall automatically run the sweep and collect measurements at each step.
- **FR-4**: The user shall be able to start and stop the transducer manually.
- **FR-5**: The user shall be able to adjust amplitude/power output if the hardware supports it.


### 2.2 Measurements & Monitoring
- **FR-6**: The system shall display real-time voltage, current, and phase measurements.
- **FR-7**: The system shall determine the frequency at which the phase difference is minimal (resonance frequency).
- **FR-8**: The user shall be able to view results in tabular and graphical format.

### 2.3 Data Management
- **FR-9**: The user shall be able to save sweep results (frequency vs. phase/current data) to a file.
- **FR-10**: The user shall be able to load previously saved results for review.

### 2.4 Backend Communication
- **FR-11**: The frontend shall communicate with the Python backend to send commands and receive measurement data.
- **FR-12**: The system shall automatically select an available port for the backend service and expose it to the frontend.

### 2.5 Device Detection & Connection

- **FR-13**: The system shall automatically detect available serial/COM ports on startup.
- **FR-14**: The user shall be able to manually refresh the list of available ports.
- **FR-15**: The user shall be able to select a COM port from the list to connect to the hardware.
- **FR-16**: The system shall indicate connection status (connected / disconnected).
- **FR-17**: The system shall handle disconnections gracefully and allow the user to reconnect.

## 3. Non-Functional Requirements

### 3.1 Constraints (System Capabilities)
- **NFR-1**: The system must support frequencies between 20 kHz and 140 kHz, with a minimum step resolution of 0.1 Hz.

### 3.2 Reliability
- **NFR-2**: The application shall not crash when communication errors (or other expected errors) occur.
- **NFR-3**: The application should handle disconnections or measurement errors gracefully and notify the user.
- **NFR-4**: The system should work offline without requiring internet access.

### 3.3 Usability
- **NFR-5**: The interface should be simple and intuitive, requiring minimal training.

### 3.4 Portability

- **NFR-6**: The application shall run on Windows (10 or newer).  
  (Linux and macOS builds optional if needed.)

### 3.5 Maintainability
- **NFR-7**: The codebase shall follow modular design principles with React components and a separate backend service to facilitate future extensions.

---