/*import path from 'path';
import { app } from 'electron';
import { isDev } from './util.js';

export function getPreloadPath() {
  if (isDev()) {
    return path.join(app.getAppPath(), 'dist-electron', 'preload.cjs');
  }
  return path.join(app.getAppPath(), 'dist-electron', 'preload.cjs'); // same for prod if inside asar
}*/


import path from "path";
import { app } from "electron";
import { isDev } from './util.js';

export function getPreloadPath() {
    return path.join(
        app.getAppPath(),               // Get the base path of the app from electron
        isDev() ? '.' : '..',           // In dvelopment, use current directory, in production, go up one directory
        '/dist-electron/preload.cjs'
    );
}