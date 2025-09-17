const { contextBridge, ipcRenderer } = require("electron");

// Wrap ipcRenderer methods in a safe API
// ExposeInMainWorld allows you to safely expose APIs from the main process to the renderer process
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(channel: string, listener: (...args: any[]) => void) {
    ipcRenderer.on(channel, (event : any[], ...args : any[]) => listener(event, ...args));
  },
  off(channel: string, listener: (...args: any[]) => void) {
    ipcRenderer.off(channel, listener);
  },
  send(channel: string, ...args: any[]) {
    ipcRenderer.send(channel, ...args);
  },
  invoke(channel: string, ...args: any[]) {
    return ipcRenderer.invoke(channel, ...args);
  },
  focusWindow() {
    ipcRenderer.send("focus-window");
  },
});

contextBridge.exposeInMainWorld("electron", {
    getWelcomeMessage: () => "Welcome to Electron! (this message was shared via IPC)",
});
