import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(channel: string, listener: (...args: any[]) => void) {
    ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
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
    ipcRenderer.send('focus-window');
  }
});
