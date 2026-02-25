# SCMATU-Software
Control and visualization app for the thesis project "SCMATU," which aims to evaluate the effectiveness of ultrasound treatment for controlling algal blooms. The system can sweep frequencies and measure resonance between voltage and current on PZT ultrasonic transducers.

## 📦 Download (Latest Release)

You can download the latest stable version here:

- Download for Windows 10 & above (64 bits): ![Latest Installer](https://github.com/SCMATU-FCEFyN-UNC/SCMATU-Software/releases/latest/download/ultrasonic-amplifier-control-win-x64.installer.exe)

## 🛠 Development Environment Setup

To configure the full development workflow on your local machine, follow these steps:

### 1. Initialize Local Repository

If you downloaded the source code as a ZIP file, initialize git:

```bash
git init
```

### 2. Mark Directory as Safe (If Required)

Some environments may require explicitly marking the repository as safe.

- Bash (Git Bash, WSL, macOS Terminal, Linux):

```bash
git config --global --add safe.directory "$(pwd)"
```

- PowerShell:

```powershell
git config --global --add safe.directory "%cd%"
```

### 3. Add Remote Repository and Pull Branches

```bash
git remote add origin https://github.com/SCMATU-FCEFyN-UNC/SCMATU-Software.git
git pull origin main
git pull origin develop
```

### 4. Install Frontend Dependencies (Node.js)

Make sure Node.js is installed, then run:

```bash
npm install
```

### 5. Install Backend Dependencies (Python)

Make sure Python 3.10+ is installed, then run:

```bash
pip install -r src/electron/backend/requirements.txt
```

After completing these steps, your development environment will be fully configured and ready to run the application in development mode.

## ▶ Running in Development Mode

To start the full development environment:

```bash
npm run dev
```

This command runs the frontend and Electron processes in parallel:

- **Vite Dev Server** starts on `http://localhost:5123`
- The **Electron main process** is transpiled from TypeScript and launched using `electronmon`
- TypeScript files in `src/electron/` are watched and automatically recompiled on changes
- The React frontend supports hot-module reloading via Vite
- Saving changes in the frontend triggers instant re-rendering
- Saving changes in the Electron main process triggers automatic restart

The Python backend is started automatically by the Electron main process in development mode. Backend logs will appear in the terminal.

This setup allows full-stack development with live reloading across:
- React frontend
- Electron main process
- Backend integration

---

## 🏗 Production Build

To generate a production build (including the packaged backend executable and installer):

```bash
npm run build
```

This command performs the following steps:

1. Builds the Python backend using PyInstaller (`--onefile`)
2. Compiles Electron TypeScript files
3. Builds the React frontend using Vite
4. Generates platform-specific installers via `electron-builder`

You may olso build for your OS specifically:

- Windows
    ```bash
    npm run dist:win
    ```

- Linux
    ```bash
    npm run dist:linux
    ```

- MAC
    ```bash
    npm run dist:mac
    ```

The installer will be generated in the `dist/` directory.

---

## 📄 Documentation

- [User Manual](docs/user_manual.md)
- [Software Requirements Specification](docs/requirements.md)