const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { initDb } = require('./database');
const { registerIpcHandlers } = require('./ipc');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      title: "Agiliza Corban",
      backgroundColor: '#0f172a',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // Remove menu em inglês padrão do Electron
    mainWindow.setMenuBarVisibility(false);

    mainWindow.loadFile(path.join(__dirname, '../out/index.html')).catch(e => {
      console.error('Erro ao carregar interface:', e.message);
    });

    mainWindow.on('closed', function () {
      mainWindow = null;
    });
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('ready', async () => {
    const dbSuccess = await initDb();
    if (!dbSuccess) {
      dialog.showErrorBox('Erro fatal', 'Não foi possível inicializar o banco de dados local. O app será encerrado.');
      app.quit();
      return;
    }

    ipcMain.handle('db:check', () => true);
    registerIpcHandlers();
    createWindow();
  });

  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', function () {
    if (mainWindow === null) createWindow();
  });
}
