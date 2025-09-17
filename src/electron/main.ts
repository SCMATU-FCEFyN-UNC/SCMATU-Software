// @ts-ignore
import {app, BrowserWindow} from 'electron';
import path from 'path';
import { isDev } from './util.js';
//import { dirname } from 'path';
//import { fileURLToPath } from 'url';
import { getPreloadPath } from './pathResolver.js';

//const __dirname = dirname(fileURLToPath(import.meta.url));

app.on('ready', () => {
    
    //const preloadPath = path.resolve(__dirname, 'preload.js');

    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
        contextIsolation: true,
        preload: getPreloadPath(), // Run preload before loading the renderer, using the cross-platform obtained preload path
        },
    });

    
    if (isDev()) {
        mainWindow.loadURL('http://localhost:5123'); // Vite dev server
    } else {
        mainWindow.loadFile(path.join(app.getAppPath(), 'dist-react/index.html')); // Production build
    }
});