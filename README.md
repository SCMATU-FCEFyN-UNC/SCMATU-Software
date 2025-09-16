# SCMATU-Software
Control and visualization app for the thesis project "SCMATU," which aims to evaluate the effectiveness of ultrasound treatment for controlling algal blooms. The system can sweep frequencies and measure resonance between voltage and current on PZT ultrasonic transducers.

## Repository Initialization
    
To work with this repository ni your local machine, use the following commands:

- Init git repository

    ```bash
    git init
    ```
- Add your working directory as a safe one.

    - Windows

        ```bash
        git config --global --add safe.directory "%cd%"
        ```

    - macOS/Linux

        ```bash
        git config --global --add safe.directory "$(pwd)"
        ```

- Add remote repository and pull

    ```bash
    git remote add origin https://github.com/SCMATU-FCEFyN-UNC/SCMATU-Software.git
    git pull origin main
    git pull develop
    ```

## 📄 Documentation

- [Software Requirements Specification](docs/requirements.md)