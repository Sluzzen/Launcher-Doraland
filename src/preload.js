// === PRELOAD.JS - Puente seguro entre UI y Electron ===
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('doraland', {
  // Controles de ventana
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Configuración
  getConfig: () => ipcRenderer.invoke('get-config'),
  getSession: () => ipcRenderer.invoke('get-session'),
  saveSession: (s) => ipcRenderer.invoke('save-session', s),
  clearSession: () => ipcRenderer.invoke('clear-session'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  openGameFolder: () => ipcRenderer.invoke('open-game-folder'),

  // Sistema de Skins (No Premium y Vista Previa)
  getSkin: () => ipcRenderer.invoke('get-skin'),
  selectSkinFile: () => ipcRenderer.invoke('select-skin-file'),
  saveSkinData: (payload) => ipcRenderer.invoke('save-skin-data', payload),
  importSkinByNick: (nick) => ipcRenderer.invoke('import-skin-by-nick', nick),
  resetSkin: () => ipcRenderer.invoke('reset-skin'),

  // Autenticación
  authMicrosoft: () => ipcRenderer.invoke('auth-microsoft'),
  authOffline: (username) => ipcRenderer.invoke('auth-offline', username),

  // Lanzamiento
  launchGame: (opts) => ipcRenderer.invoke('launch-game', opts),

  // Eventos del juego
  onLaunchLog: (cb) => ipcRenderer.on('launch-log', (_, data) => cb(data)),
  onLaunchProgress: (cb) => ipcRenderer.on('launch-progress', (_, data) => cb(data)),
  onLaunchStatus: (cb) => ipcRenderer.on('launch-status', (_, data) => cb(data)),
  onLaunchClose: (cb) => ipcRenderer.on('launch-close', (_, code) => cb(code)),
  onAuthUpdate: (cb) => ipcRenderer.on('auth-update', (_, data) => cb(data)),

  // Remover listeners (para evitar memory leaks)
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // Auto-actualizador del launcher
  checkLauncherUpdate: () => ipcRenderer.invoke('check-launcher-update'),
  downloadLauncherUpdate: () => ipcRenderer.invoke('download-launcher-update'),
  installLauncherUpdate: () => ipcRenderer.invoke('install-launcher-update'),
  onLauncherUpdateAvailable: (cb) => ipcRenderer.on('launcher-update-available', (_, data) => cb(data)),
  onLauncherUpdateProgress: (cb) => ipcRenderer.on('launcher-update-progress', (_, data) => cb(data)),
  onLauncherUpdateDownloaded: (cb) => ipcRenderer.on('launcher-update-downloaded', (_, data) => cb(data)),

  // Links externos
  openExternal: (url) => ipcRenderer.send('open-external', url)
});

