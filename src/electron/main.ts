// @ts-ignore
import {app, BrowserWindow} from 'electron';
import path from 'path';
import { isDev } from './util.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

app.on('ready', () => {
    
    const preloadPath = path.resolve(__dirname, 'preload.js');

    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
        contextIsolation: true,
        preload: preloadPath, // Use the correct path to preload.js
        },
    });

    
    if (isDev()) {
        mainWindow.loadURL('http://localhost:5123'); // Vite dev server
    } else {
        mainWindow.loadFile(path.join(app.getAppPath(), 'dist-react/index.html')); // Production build
    }
});