// === PRELOAD.JS - Puente seguro entre UI y Electron ===
// Desarrollado por SLuzzen
const { contextBridge, ipcRenderer } = require('electron');

const __PRELOAD_WM__ = Object.freeze({
  author: Buffer.from('RGVzYXJyb2xsYWRvIHBvciBTTHV6emVu', 'base64').toString('utf8'),
  codes: [68, 101, 115, 97, 114, 114, 111, 108, 108, 97, 100, 111, 32, 112, 111, 114, 32, 83, 76, 117, 122, 122, 101, 110]
});
Symbol.for('doraland.preload.sluzzen');

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

  // Sistema de Skins y Capas (Capas: Beneficio Exclusivo Premium)
  getSkin: () => ipcRenderer.invoke('get-skin'),
  selectSkinFile: () => ipcRenderer.invoke('select-skin-file'),
  saveSkinData: (payload) => ipcRenderer.invoke('save-skin-data', payload),
  importSkinByNick: (nick) => ipcRenderer.invoke('import-skin-by-nick', nick),
  resetSkin: () => ipcRenderer.invoke('reset-skin'),
  getCape: () => ipcRenderer.invoke('get-cape'),
  saveCape: (payload) => ipcRenderer.invoke('save-cape', payload),
  selectCapeFile: () => ipcRenderer.invoke('select-cape-file'),

  // Gestor de Complementos de Cliente (Mods Cliente, Resource Packs y Shaders)
  getUserAddons: () => ipcRenderer.invoke('get-user-addons'),
  searchAddonsCatalog: (queryOpts) => ipcRenderer.invoke('search-addons-catalog', queryOpts),
  installRemoteAddon: (payload) => ipcRenderer.invoke('install-remote-addon', payload),
  installLocalAddon: (category) => ipcRenderer.invoke('install-local-addon', category),
  removeUserAddon: (payload) => ipcRenderer.invoke('remove-user-addon', payload),
  openAddonFolder: (category) => ipcRenderer.invoke('open-addon-folder', category),

  // Changelog y Optimización
  getChangelog: () => ipcRenderer.invoke('get-changelog'),
  optimizeLauncher: () => ipcRenderer.invoke('optimize-launcher'),

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

