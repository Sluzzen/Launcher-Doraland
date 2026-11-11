// === PROCESO PRINCIPAL (main.js) - Doraland Launcher ===
// Incluye:
// 1. Auto-actualización de Launcher (electron-updater con GitHub Releases)
// 2. Auto-actualización de Mods y Config remota (Sincronización de Manifiesto en GitHub/Hosting)
// 3. Sincronización de Overrides (configs, FancyMenu, DrippyLoadingScreen, shaderpacks)
// 4. Gestor multimotor dinámico (NeoForge, Forge, Fabric, Quilt, Híbridos, Plugins y Vanilla)
// 5. Suite completa de protecciones, validaciones e integridad

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const https = require('https');
const os = require('os');
const { spawn, spawnSync, execSync } = require('child_process');
const { autoUpdater } = require('electron-updater');

// ============================================================================
// 1. PROTECCIÓN DE INSTANCIA ÚNICA (Single Instance Lock)
// ============================================================================
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// ============================================================================
// 2. CONFIGURACIÓN PREDETERMINADA Y GESTORES DE MODS/PLUGINS
// ============================================================================
const DEFAULT_LOADERS = {
  neoforge: "21.1.250",
  forge: "",
  fabric: "",
  quilt: "",
  liteloader: "",
  optifine: "",
  rift: "",
  arclight: "",
  mohist: "",
  magma: "",
  banner: "",
  ketting: "",
  youer: "",
  catserver: "",
  crucible: "",
  spongeforge: "",
  sponge: "",
  paper: "",
  purpur: "",
  pufferfish: "",
  folia: "",
  spigot: "",
  bukkit: "",
  craftbukkit: "",
  glowstone: "",
  velocity: "",
  bungeecord: "",
  waterfall: "",
  vanilla: ""
};

const LOADER_DISPLAY_NAMES = {
  neoforge: "NeoForge",
  forge: "Forge",
  fabric: "Fabric",
  quilt: "Quilt",
  liteloader: "LiteLoader",
  optifine: "OptiFine",
  rift: "Rift",
  arclight: "Arclight",
  mohist: "Mohist",
  magma: "Magma",
  banner: "Banner",
  ketting: "Ketting",
  youer: "Youer",
  catserver: "CatServer",
  crucible: "Crucible",
  spongeforge: "SpongeForge",
  sponge: "Sponge",
  paper: "Paper",
  purpur: "Purpur",
  pufferfish: "Pufferfish",
  folia: "Folia",
  spigot: "Spigot",
  bukkit: "Bukkit",
  craftbukkit: "CraftBukkit",
  glowstone: "Glowstone",
  velocity: "Velocity",
  bungeecord: "BungeeCord",
  waterfall: "Waterfall",
  vanilla: "Vanilla"
};

const DEFAULT_CONFIG = {
  server: {
    name: "Doraland",
    ip: "doralandmc.holyhosting.club",
    port: 25565,
    autoConnect: true,
    description: "Servidor de Minecraft NeoForge 1.21.1"
  },
  minecraft: {
    version: "1.21.1",
    loaders: { ...DEFAULT_LOADERS },
    recommendedRamMb: 6144,
    minRamMb: 4096,
    maxRamMb: 16384,
    jvmArgs: [
      "-XX:+UseG1GC",
      "-XX:+ParallelRefProcEnabled",
      "-XX:MaxGCPauseMillis=200",
      "-XX:+UnlockExperimentalVMOptions",
      "-XX:+DisableExplicitGC",
      "-XX:G1HeapWastePercent=5",
      "-XX:G1MixedGCCountTarget=4",
      "-XX:G1MixedGCLiveThresholdPercent=90",
      "-XX:G1RSetUpdatingPauseTimePercent=5",
      "-XX:SurvivorRatio=32",
      "-XX:+PerfDisableSharedMem",
      "-XX:MaxTenuringThreshold=1"
    ]
  },
  mods: {
    enabled: true,
    source: "auto",
    remoteManifestUrl: "https://raw.githubusercontent.com/Sluzzen/Launcher-Doraland/main/mods-manifest.json",
    cleanOldMods: true,
    syncOverrides: true
  },
  updates: {
    autoUpdateLauncher: true,
    githubOwner: "Sluzzen",
    githubRepo: "Launcher-Doraland"
  },
  ui: {
    discordUrl: "",
    websiteUrl: "",
    youtubeUrl: ""
  },
  launcher: {
    version: "1.0.0",
    allowPremium: true,
    allowOffline: true,
    gameDataFolder: ".doraland",
    closeOnLaunch: false
  }
};

// Detecta el gestor activo: el único (o primero) que tenga versión no vacía en cfg.minecraft.loaders
function getActiveLoader(cfg) {
  const loaders = cfg?.minecraft?.loaders;
  if (loaders && typeof loaders === 'object') {
    for (const [key, val] of Object.entries(loaders)) {
      if (typeof val === 'string' && val.trim().length > 0) {
        const cleanType = key.toLowerCase().trim();
        const version = val.trim();
        const name = LOADER_DISPLAY_NAMES[cleanType] || key;
        return {
          type: cleanType,
          name,
          version,
          display: `${name} ${version}`
        };
      }
    }
  }

  // Compatibilidad hacia atrás si existiera forgeVersion antiguo
  if (cfg?.minecraft?.forgeVersion && String(cfg.minecraft.forgeVersion).trim()) {
    const version = String(cfg.minecraft.forgeVersion).trim();
    return {
      type: 'forge',
      name: 'Forge',
      version,
      display: `Forge ${version}`
    };
  }

  const mcVer = cfg?.minecraft?.version || '1.21.1';
  return {
    type: 'vanilla',
    name: 'Vanilla',
    version: mcVer,
    display: `Vanilla ${mcVer}`
  };
}

let _store = null;
function getStore() {
  if (!_store) {
    const Store = require('electron-store');
    _store = new Store();
  }
  return _store;
}

let mainWindow = null;
let launcherConfig = null;
let isGameRunning = false;

// Carga segura de configuración
function loadConfig() {
  const configPath = path.join(__dirname, '..', 'launcher-config.json');
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      launcherConfig = {
        ...DEFAULT_CONFIG,
        ...parsed,
        server: { ...DEFAULT_CONFIG.server, ...(parsed.server || {}) },
        minecraft: {
          ...DEFAULT_CONFIG.minecraft,
          ...(parsed.minecraft || {}),
          loaders: {
            ...DEFAULT_LOADERS,
            ...(parsed.minecraft?.loaders || {})
          }
        },
        mods: { ...DEFAULT_CONFIG.mods, ...(parsed.mods || {}) },
        updates: { ...DEFAULT_CONFIG.updates, ...(parsed.updates || {}) },
        ui: { ...DEFAULT_CONFIG.ui, ...(parsed.ui || {}) },
        launcher: { ...DEFAULT_CONFIG.launcher, ...(parsed.launcher || {}) }
      };
    } else {
      launcherConfig = { ...DEFAULT_CONFIG };
      fs.writeJsonSync(configPath, launcherConfig, { spaces: 2 });
    }
  } catch (err) {
    console.warn('[Config] Error leyendo configuración:', err.message);
    launcherConfig = { ...DEFAULT_CONFIG };
  }
  return launcherConfig;
}

// Logging persistente
function appendLauncherLog(message) {
  try {
    const logDir = path.join(app.getPath('home'), launcherConfig?.launcher?.gameDataFolder || '.doraland', 'logs');
    fs.ensureDirSync(logDir);
    const logFile = path.join(logDir, 'launcher-latest.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`, 'utf8');
  } catch {}
}

// ============================================================================
// 3. AUTO-UPDATER DEL LAUNCHER (electron-updater)
// ============================================================================
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function setupLauncherAutoUpdater() {
  autoUpdater.on('update-available', (info) => {
    appendLauncherLog(`Actualización de Launcher disponible: v${info.version}`);
    mainWindow?.webContents.send('launcher-update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes || 'Mejoras y nuevas funciones de Doraland.'
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('launcher-update-progress', {
      percent: Math.round(progress.percent),
      speed: (progress.bytesPerSecond / 1024 / 1024).toFixed(1)
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    appendLauncherLog(`Actualización de Launcher descargada: v${info.version}`);
    mainWindow?.webContents.send('launcher-update-downloaded', {
      version: info.version
    });
  });

  autoUpdater.on('error', (err) => {
    appendLauncherLog(`Aviso Auto-Updater: ${err.message}`);
  });

  if (app.isPackaged && launcherConfig?.updates?.autoUpdateLauncher !== false) {
    setTimeout(() => {
      try {
        autoUpdater.checkForUpdates().catch(() => {});
      } catch {}
    }, 3000);
  }
}

ipcMain.handle('check-launcher-update', async () => {
  try {
    const res = await autoUpdater.checkForUpdates();
    return { success: true, updateAvailable: !!res?.updateInfo };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('download-launcher-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('install-launcher-update', () => {
  autoUpdater.quitAndInstall();
});

// ============================================================================
// 4. VENTANA PRINCIPAL Y PROTECCIONES WEB
// ============================================================================
function createWindow() {
  loadConfig();
  appendLauncherLog('=== Iniciando Doraland Launcher ===');

  mainWindow = new BrowserWindow({
    width: 1020,
    height: 670,
    minWidth: 920,
    minHeight: 620,
    frame: false,
    transparent: false,
    backgroundColor: '#0D1310',
    resizable: true,
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    setupLauncherAutoUpdater();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow.webContents.getURL();
    if (url !== currentUrl && !url.startsWith('file://')) {
      event.preventDefault();
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url);
      }
    }
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ============================================================================
// 5. IPC HANDLERS: VENTANA Y AJUSTES
// ============================================================================
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

ipcMain.handle('get-config', () => {
  const cfg = loadConfig();
  return {
    ...cfg,
    activeLoader: getActiveLoader(cfg)
  };
});

ipcMain.handle('get-session', () => {
  try {
    const s = getStore().get('session', null);
    if (!s || typeof s !== 'object' || !s.name || typeof s.name !== 'string' || !s.uuid) {
      getStore().delete('session');
      return null;
    }
    return s;
  } catch {
    return null;
  }
});

ipcMain.handle('save-session', (_, session) => {
  if (session && typeof session === 'object' && session.name) {
    getStore().set('session', session);
    return true;
  }
  return false;
});

ipcMain.handle('clear-session', () => {
  getStore().delete('session');
  return true;
});

ipcMain.handle('get-system-info', () => {
  const totalMb = Math.round(os.totalmem() / 1024 / 1024);
  const freeMb = Math.round(os.freemem() / 1024 / 1024);
  const safeMaxMb = Math.max(2048, totalMb - 1536);
  return {
    totalRamMb: totalMb,
    freeRamMb: freeMb,
    safeMaxRamMb: safeMaxMb
  };
});

ipcMain.handle('get-settings', () => {
  const cfg = loadConfig();
  const totalMb = Math.round(os.totalmem() / 1024 / 1024);
  const safeMaxMb = Math.max(2048, totalMb - 1536);
  const savedRam = getStore().get('ram', cfg?.minecraft?.recommendedRamMb || 6144);
  const clampedRam = Math.min(safeMaxMb, Math.max(2048, savedRam));

  return {
    ram: clampedRam,
    closeOnLaunch: getStore().get('closeOnLaunch', false)
  };
});

ipcMain.handle('save-settings', (_, settings) => {
  if (settings && typeof settings === 'object') {
    const totalMb = Math.round(os.totalmem() / 1024 / 1024);
    const safeMaxMb = Math.max(2048, totalMb - 1536);
    const safeRam = Math.min(safeMaxMb, Math.max(2048, parseInt(settings.ram) || 6144));

    getStore().set('ram', safeRam);
    getStore().set('closeOnLaunch', Boolean(settings.closeOnLaunch));
    return true;
  }
  return false;
});

ipcMain.on('open-external', (_, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
  }
});

// ============================================================================
// 6. IPC HANDLERS: AUTENTICACIÓN (PREMIUM Y NO PREMIUM)
// ============================================================================
ipcMain.handle('auth-microsoft', async () => {
  try {
    const { Auth } = require('msmc');
    const authManager = new Auth('select_account');

    authManager.on('load', (e) => {
      mainWindow?.webContents.send('auth-update', {
        title: typeof e === 'string' ? e : 'Conectando con servidores de Microsoft...'
      });
    });

    const xboxManager = await authManager.launch('electron');
    const token = await xboxManager.getMinecraft();

    if (token.isDemo && token.isDemo()) {
      return { error: 'Esta cuenta de Microsoft no posee Minecraft comprado (cuenta Demo).' };
    }

    const session = token.mclc(true);
    if (!session || !session.name || !session.uuid) {
      return { error: 'No se pudo generar un token válido de Minecraft.' };
    }

    getStore().set('session', session);
    appendLauncherLog(`Login exitoso (Microsoft): ${session.name}`);
    return { success: true, session };
  } catch (err) {
    appendLauncherLog(`Error login Microsoft: ${err}`);
    if (err === 'error.gui.closed') {
      return { error: 'Inicio de sesión cancelado (ventana cerrada).' };
    }
    return { error: typeof err === 'string' ? err : err.message || 'Error en inicio de sesión con Microsoft' };
  }
});

ipcMain.handle('auth-offline', async (_, username) => {
  const trimmed = (username || '').trim();

  if (trimmed.length < 3) {
    return { error: 'El nombre debe tener al menos 3 caracteres.' };
  }
  if (trimmed.length > 16) {
    return { error: 'El nombre no puede tener más de 16 caracteres.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { error: 'Solo se permiten letras inglesas, números y guión bajo (_).' };
  }

  try {
    const { Authenticator } = require('minecraft-launcher-core');
    const session = await Authenticator.getAuth(trimmed);

    if (!session || !session.name) {
      return { error: 'Error al generar la sesión offline.' };
    }

    getStore().set('session', session);
    appendLauncherLog(`Login exitoso (No Premium): ${session.name}`);
    return { success: true, session };
  } catch (err) {
    appendLauncherLog(`Error login offline: ${err.message}`);
    return { error: err.message || 'Error al autenticar modo No Premium' };
  }
});

// ============================================================================
// 7. VALIDACIÓN DE ENTORNO JAVA 21
// ============================================================================
function checkJavaExecutable(javaBin) {
  try {
    if (!fs.existsSync(javaBin)) return { valid: false, reason: 'Ruta no encontrada' };

    const res = spawnSync(javaBin, ['-version'], { encoding: 'utf8', timeout: 5000 });
    const output = (res.stderr || '') + (res.stdout || '');

    const match = output.match(/(?:version|openjdk)\s+"([0-9]+)(?:\.([0-9]+))?/i);
    if (!match) {
      return { valid: false, reason: 'No se pudo determinar la versión de Java' };
    }

    const major = match[1] === '1' ? parseInt(match[2], 10) : parseInt(match[1], 10);
    if (major >= 21) {
      return { valid: true, major, versionStr: match[0], path: javaBin };
    } else {
      return {
        valid: false,
        major,
        reason: `Java ${major} detectado. Minecraft 1.21.1 requiere obligatoriamente Java 21+`,
        path: javaBin
      };
    }
  } catch (err) {
    return { valid: false, reason: err.message };
  }
}

async function findAndValidateJava() {
  const cfg = loadConfig();

  if (cfg.minecraft?.javaPath) {
    const customCheck = checkJavaExecutable(cfg.minecraft.javaPath);
    if (customCheck.valid) return customCheck;
  }

  const candidates = [
    'C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\java.exe',
    'C:\\Program Files\\Java\\jdk-21\\bin\\java.exe',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.1.12-hotspot\\bin\\java.exe',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.2.13-hotspot\\bin\\java.exe',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.3.9-hotspot\\bin\\java.exe',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.4.7-hotspot\\bin\\java.exe',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.5.11-hotspot\\bin\\java.exe',
    'C:\\Program Files\\Microsoft\\jdk-21.0.1.12-hotspot\\bin\\java.exe',
    'C:\\Program Files\\Zulu\\zulu-21\\bin\\java.exe',
    'C:\\Program Files\\Java\\jdk-21.0.1\\bin\\java.exe',
    'C:\\Program Files\\Java\\jdk-21.0.2\\bin\\java.exe'
  ];

  for (const c of candidates) {
    const check = checkJavaExecutable(c);
    if (check.valid) return check;
  }

  if (process.env.JAVA_HOME) {
    const javaBin = path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    const check = checkJavaExecutable(javaBin);
    if (check.valid) return check;
  }

  if (process.platform === 'win32') {
    try {
      const whereLines = execSync('where.exe java', { encoding: 'utf8', timeout: 3000 }).trim().split(/\r?\n/);
      for (const line of whereLines) {
        const check = checkJavaExecutable(line.trim());
        if (check.valid) return check;
      }
    } catch {}
  }

  return {
    valid: false,
    reason: 'No se encontró Java 21 en el equipo.',
    downloadUrl: 'https://adoptium.net/temurin/releases/?version=21'
  };
}

// ============================================================================
// 8. DESCARGAS HTTP CON REDIRECCIÓN Y VALIDACIÓN
// ============================================================================
function fetchRemoteJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'DoralandLauncher' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchRemoteJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'DoralandLauncher' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return downloadFile(res.headers.location, dest, onProgress).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total > 0 && onProgress) {
          onProgress(Math.round((downloaded / total) * 100));
        }
      });
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.remove(dest).catch(() => {});
      reject(err);
    });
  });
}

function isValidJarFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size < 1000) return false;

    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  } catch {
    return false;
  }
}

// ============================================================================
// 9. SINCRONIZACIÓN DE OVERRIDES (CONFIGS, FANCYMENU, SHADERPACKS)
// ============================================================================
async function syncOverridesProtected(gameDir, cfg, event) {
  if (cfg.mods?.syncOverrides === false) return;

  let bundledOverridesPath;
  if (app.isPackaged) {
    bundledOverridesPath = path.join(path.dirname(app.getPath('exe')), 'overrides');
    if (!fs.existsSync(bundledOverridesPath)) {
      bundledOverridesPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'overrides');
    }
    if (!fs.existsSync(bundledOverridesPath)) {
      bundledOverridesPath = path.join(process.resourcesPath, 'overrides');
    }
    if (!fs.existsSync(bundledOverridesPath)) {
      bundledOverridesPath = path.join(__dirname, '..', 'overrides');
    }
  } else {
    bundledOverridesPath = path.join(__dirname, '..', 'overrides');
  }

  if (!fs.existsSync(bundledOverridesPath)) {
    return;
  }

  event?.sender.send('launch-log', { type: 'info', msg: '🎨 Sincronizando configuraciones, menú Doraland y shaders...' });

  // Archivos de preferencias personales que no deben sobrescribirse si el jugador ya los modificó
  const userProtectedRelPaths = new Set([
    'options.txt',
    'servers.dat',
    path.normalize('config/sodium-options.json'),
    path.normalize('config/iris.properties'),
    path.normalize('config/ImmediatelyFast.json')
  ]);

  let syncedFiles = 0;

  async function copyDirSelective(srcDir, destDir, relBase = '') {
    await fs.ensureDir(destDir);
    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcFull = path.join(srcDir, entry.name);
      const destFull = path.join(destDir, entry.name);
      const relPath = path.normalize(relBase ? path.join(relBase, entry.name) : entry.name);

      if (entry.isDirectory()) {
        await copyDirSelective(srcFull, destFull, relPath);
      } else if (entry.isFile()) {
        const exists = fs.existsSync(destFull);
        if (exists && userProtectedRelPaths.has(relPath)) {
          continue;
        }

        let shouldCopy = !exists;
        if (exists) {
          try {
            const sStat = await fs.stat(srcFull);
            const dStat = await fs.stat(destFull);
            // Actualizar siempre los recursos de FancyMenu / DrippyLoadingScreen si cambiaron de tamaño
            if (relPath.startsWith(path.normalize('config/fancymenu')) || relPath.startsWith(path.normalize('config/drippyloadingscreen'))) {
              shouldCopy = sStat.size !== dStat.size;
            }
          } catch {}
        }

        if (shouldCopy) {
          await fs.copy(srcFull, destFull, { overwrite: true });
          syncedFiles++;
        }
      }
    }
  }

  try {
    await copyDirSelective(bundledOverridesPath, gameDir);
    if (syncedFiles > 0) {
      event?.sender.send('launch-log', { type: 'info', msg: `✔️ Se aplicaron ${syncedFiles} archivos de configuración/interfaz de Doraland.` });
    } else {
      event?.sender.send('launch-log', { type: 'info', msg: '✔️ Configuraciones e interfaz de Doraland al día.' });
    }
  } catch (err) {
    event?.sender.send('launch-log', { type: 'warn', msg: `⚠️ Aviso sincronizando overrides: ${err.message}` });
  }
}

// ============================================================================
// 10. SINCRONIZACIÓN DE MODS HÍBRIDA (REMOTA Y LOCAL BUNDLED)
// ============================================================================
async function syncModsProtected(gameDir, cfg, event) {
  const targetModsPath = path.join(gameDir, 'mods');
  await fs.ensureDir(targetModsPath);

  if (cfg.mods?.remoteManifestUrl && cfg.mods?.source !== 'bundled') {
    try {
      event?.sender.send('launch-log', { type: 'info', msg: '🌐 Conectando con el repositorio para verificar actualizaciones de mods...' });
      const manifest = await fetchRemoteJson(cfg.mods.remoteManifestUrl);

      if (manifest && Array.isArray(manifest.mods)) {
        if (manifest.server?.ip) cfg.server.ip = manifest.server.ip;
        if (manifest.minecraft?.loaders && typeof manifest.minecraft.loaders === 'object') {
          cfg.minecraft.loaders = { ...cfg.minecraft.loaders, ...manifest.minecraft.loaders };
        }

        if (manifest.mods.length > 0) {
          event?.sender.send('launch-log', { type: 'info', msg: `📦 Manifiesto remoto recibido: ${manifest.mods.length} mods.` });
          await syncRemoteModsList(manifest.mods, targetModsPath, cfg, event);
          return;
        }
      }
    } catch (err) {
      event?.sender.send('launch-log', { type: 'warn', msg: `⚠️ Manifiesto remoto no disponible (${err.message}). Usando paquete local.` });
    }
  }

  await syncLocalBundledMods(targetModsPath, cfg, event);
}

async function syncRemoteModsList(remoteMods, targetModsPath, cfg, event) {
  const remoteNames = remoteMods.map(m => m.name.toLowerCase());

  if (cfg.mods?.cleanOldMods && remoteMods.length > 0) {
    const localFiles = await fs.readdir(targetModsPath);
    for (const file of localFiles) {
      if (file.toLowerCase().endsWith('.jar') && !remoteNames.includes(file.toLowerCase())) {
        await fs.remove(path.join(targetModsPath, file));
        event?.sender.send('launch-log', { type: 'warn', msg: `🗑️ Mod eliminado (no requerido): ${file}` });
      }
    }
  }

  let updatedCount = 0;
  for (let i = 0; i < remoteMods.length; i++) {
    const mod = remoteMods[i];
    const destPath = path.join(targetModsPath, mod.name);

    let needsDownload = true;
    if (fs.existsSync(destPath) && isValidJarFile(destPath)) {
      const stat = await fs.stat(destPath);
      if (mod.size && stat.size === mod.size) {
        needsDownload = false;
      }
    }

    if (needsDownload) {
      event?.sender.send('launch-log', { type: 'info', msg: `⬇️ Descargando mod (${i + 1}/${remoteMods.length}): ${mod.name}...` });

      let modUrl = mod.url;
      if (!modUrl && cfg.mods.remoteManifestUrl) {
        const baseUrl = cfg.mods.remoteManifestUrl.substring(0, cfg.mods.remoteManifestUrl.lastIndexOf('/'));
        modUrl = `${baseUrl}/mods/${encodeURIComponent(mod.name)}`;
      }

      try {
        await downloadFile(modUrl, destPath, (pct) => {
          event?.sender.send('launch-progress', {
            type: `Mod: ${mod.name}`,
            task: pct,
            total: 100
          });
        });

        if (isValidJarFile(destPath)) {
          updatedCount++;
          event?.sender.send('launch-log', { type: 'info', msg: `✅ Mod sincronizado: ${mod.name}` });
        } else {
          await fs.remove(destPath);
          event?.sender.send('launch-log', { type: 'error', msg: `❌ Mod descargado dañado: ${mod.name}` });
        }
      } catch (dlErr) {
        event?.sender.send('launch-log', { type: 'error', msg: `❌ Error descargando ${mod.name}: ${dlErr.message}` });
      }
    }
  }

  if (updatedCount === 0) {
    event?.sender.send('launch-log', { type: 'info', msg: `✔️ Todos los mods están al día (${remoteMods.length} mods).` });
  } else {
    event?.sender.send('launch-log', { type: 'info', msg: `🎉 Se actualizaron ${updatedCount} mods automáticamente.` });
  }
}

async function syncLocalBundledMods(targetModsPath, cfg, event) {
  let bundledModsPath;
  if (app.isPackaged) {
    bundledModsPath = path.join(path.dirname(app.getPath('exe')), 'mods');
    if (!fs.existsSync(bundledModsPath)) {
      bundledModsPath = path.join(process.resourcesPath, 'mods');
    }
  } else {
    bundledModsPath = path.join(__dirname, '..', 'mods');
  }

  if (!fs.existsSync(bundledModsPath)) {
    return;
  }

  const rawFiles = await fs.readdir(bundledModsPath);
  const bundledJars = rawFiles.filter(f => f.toLowerCase().endsWith('.jar'));

  if (bundledJars.length === 0) {
    const existing = (await fs.readdir(targetModsPath)).filter(f => f.toLowerCase().endsWith('.jar'));
    event?.sender.send('launch-log', { type: 'info', msg: `📦 Mods instalados en carpeta del juego: ${existing.length} mods.` });
    return;
  }

  event?.sender.send('launch-log', { type: 'info', msg: `📦 Sincronizando ${bundledJars.length} mods desde el paquete local...` });

  if (cfg.mods?.cleanOldMods) {
    const currentFiles = await fs.readdir(targetModsPath);
    for (const file of currentFiles) {
      if (file.toLowerCase().endsWith('.jar') && !bundledJars.includes(file)) {
        await fs.remove(path.join(targetModsPath, file));
        event?.sender.send('launch-log', { type: 'warn', msg: `🗑️ Mod no requerido eliminado: ${file}` });
      }
    }
  }

  let updatedCount = 0;
  for (const jarName of bundledJars) {
    const srcPath = path.join(bundledModsPath, jarName);
    const destPath = path.join(targetModsPath, jarName);

    if (!isValidJarFile(srcPath)) continue;

    let needsCopy = true;
    if (fs.existsSync(destPath) && isValidJarFile(destPath)) {
      const srcStat = await fs.stat(srcPath);
      const destStat = await fs.stat(destPath);
      needsCopy = srcStat.size !== destStat.size;
    }

    if (needsCopy) {
      await fs.copy(srcPath, destPath, { overwrite: true });
      updatedCount++;
      event?.sender.send('launch-log', { type: 'info', msg: `✅ Mod sincronizado: ${jarName}` });
    }
  }

  if (updatedCount === 0) {
    event?.sender.send('launch-log', { type: 'info', msg: `✔️ Mods locales al día (${bundledJars.length} mods verificados).` });
  } else {
    event?.sender.send('launch-log', { type: 'info', msg: `🎉 Se actualizaron ${updatedCount} mods locales.` });
  }
}

// ============================================================================
// 11. INSTALADOR MULTIMOTOR (NEOFORGE, FORGE, FABRIC, QUILT, VANILLA/PLUGINS)
// ============================================================================

// Resuelve los placeholders de arguments.jvm de NeoForge / Forge moderno (BootstrapLauncher)
function resolveModernLoaderJvmArgs(versionJson, gameDir, customVersion, mcVersion) {
  if (!versionJson?.arguments?.jvm || !Array.isArray(versionJson.arguments.jvm)) {
    return [];
  }

  const libDirNormalized = path.join(gameDir, 'libraries').replace(/\\/g, '/');
  const cpSeparator = path.delimiter;
  const resolved = [];

  for (const rawArg of versionJson.arguments.jvm) {
    if (typeof rawArg !== 'string') continue;

    let arg = rawArg
      .replace(/\$\{library_directory\}/g, libDirNormalized)
      .replace(/\$\{classpath_separator\}/g, cpSeparator)
      .replace(/\$\{version_name\}/g, customVersion);

    // Asegurar que BootstrapLauncher ignore también el jar base si aparece en -cp
    if (arg.startsWith('-DignoreList=') && !arg.includes(`${mcVersion}.jar`)) {
      arg = `${arg},${mcVersion}.jar`;
    }

    resolved.push(arg);
  }

  return resolved;
}

// Ejecuta un instalador CLI en Java (--install-client / --installClient)
function runJavaInstallerCli(javaPath, args, cwd, event, label) {
  return new Promise((resolve, reject) => {
    const proc = spawn(javaPath, args, { cwd });

    proc.stdout.on('data', (data) => {
      const lines = data.toString('utf8').trim().split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;
        if (line.includes('Downloading') || line.includes('Processor') || line.includes('Splitting') || line.includes('Patching') || line.includes('Renaming') || line.includes('Successfully')) {
          event?.sender.send('launch-log', { type: 'info', msg: `[${label}] ${line.trim()}` });
        } else {
          event?.sender.send('launch-log', { type: 'debug', msg: `[${label}] ${line.trim()}` });
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString('utf8').trim();
      if (text) {
        event?.sender.send('launch-log', { type: 'debug', msg: `[${label}] ${text}` });
      }
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`El instalador de ${label} terminó con código ${code}`));
    });
  });
}

async function ensureActiveLoaderInstalled(gameDir, mcVersion, loader, javaPath, event) {
  const installersDir = path.join(gameDir, 'installers');
  await fs.ensureDir(installersDir);

  // Asegurar que exista launcher_profiles.json (requerido por los instaladores de NeoForge y Forge)
  const profilesPath = path.join(gameDir, 'launcher_profiles.json');
  if (!fs.existsSync(profilesPath)) {
    await fs.writeJson(profilesPath, { profiles: {} }, { spaces: 2 });
  }

  const type = loader.type;
  const ver = loader.version;

  // ── CASO 1: NEOFORGE (y servidores híbridos basados en NeoForge como Youer) ──
  if (type === 'neoforge' || type === 'youer') {
    const customId = `neoforge-${ver}`;
    const versionJsonPath = path.join(gameDir, 'versions', customId, `${customId}.json`);
    const patchedClientJar = path.join(gameDir, 'libraries', 'net', 'neoforged', 'neoforge', ver, `neoforge-${ver}-client.jar`);

    if (!fs.existsSync(versionJsonPath) || !fs.existsSync(patchedClientJar)) {
      const installerName = `neoforge-${ver}-installer.jar`;
      const installerPath = path.join(installersDir, installerName);

      if (!fs.existsSync(installerPath) || !isValidJarFile(installerPath)) {
        event?.sender.send('launch-log', { type: 'info', msg: `⬇️ Descargando instalador oficial de NeoForge ${ver}...` });
        const downloadUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${ver}/${installerName}`;

        await downloadFile(downloadUrl, installerPath, (pct) => {
          event?.sender.send('launch-progress', {
            type: `NeoForge ${ver} Installer`,
            task: pct,
            total: 100
          });
        });

        if (!isValidJarFile(installerPath)) {
          await fs.remove(installerPath);
          throw new Error(`El instalador descargado de NeoForge ${ver} está corrupto.`);
        }
      }

      event?.sender.send('launch-log', { type: 'info', msg: `⚙️ Instalando NeoForge ${ver} (primera vez, esto puede tardar 1-2 minutos)...` });
      event?.sender.send('launch-progress', { type: `Instalando NeoForge ${ver}`, task: 50, total: 100 });

      await runJavaInstallerCli(
        javaPath,
        ['-jar', installerPath, '--install-client', gameDir],
        gameDir,
        event,
        `NeoForge ${ver}`
      );

      event?.sender.send('launch-log', { type: 'info', msg: `✅ NeoForge ${ver} instalado correctamente.` });
    } else {
      event?.sender.send('launch-log', { type: 'info', msg: `⚡ NeoForge ${ver} verificado en caché.` });
    }

    const versionJson = await fs.readJson(versionJsonPath);
    const extraJvmArgs = resolveModernLoaderJvmArgs(versionJson, gameDir, customId, mcVersion);

    return {
      customVersion: customId,
      extraJvmArgs,
      forgeInstaller: null
    };
  }

  // ── CASO 2: FORGE (y servidores híbridos Forge como Mohist, Arclight, Magma, CatServer, Ketting, SpongeForge, Crucible) ──
  if (['forge', 'mohist', 'arclight', 'magma', 'catserver', 'ketting', 'spongeforge', 'crucible'].includes(type)) {
    const fullVer = ver.includes('-') ? ver : `${mcVersion}-${ver}`;
    const shortVer = fullVer.startsWith(`${mcVersion}-`) ? fullVer.slice(mcVersion.length + 1) : ver;
    const customId = `${mcVersion}-forge-${shortVer}`;
    const versionJsonPath = path.join(gameDir, 'versions', customId, `${customId}.json`);

    const installerName = `forge-${fullVer}-installer.jar`;
    const installerPath = path.join(installersDir, installerName);

    if (!fs.existsSync(installerPath) || !isValidJarFile(installerPath)) {
      event?.sender.send('launch-log', { type: 'info', msg: `⬇️ Descargando instalador de Forge ${fullVer}...` });
      const downloadUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${fullVer}/${installerName}`;

      await downloadFile(downloadUrl, installerPath, (pct) => {
        event?.sender.send('launch-progress', {
          type: `Forge ${fullVer} Installer`,
          task: pct,
          total: 100
        });
      });

      if (!isValidJarFile(installerPath)) {
        await fs.remove(installerPath);
        throw new Error(`El instalador de Forge ${fullVer} está corrupto.`);
      }
    }

    if (fs.existsSync(versionJsonPath)) {
      const versionJson = await fs.readJson(versionJsonPath);
      const extraJvmArgs = resolveModernLoaderJvmArgs(versionJson, gameDir, customId, mcVersion);
      return {
        customVersion: customId,
        extraJvmArgs,
        forgeInstaller: null
      };
    }

    return {
      customVersion: null,
      extraJvmArgs: [],
      forgeInstaller: installerPath
    };
  }

  // ── CASO 3: FABRIC (y Banner) ──
  if (type === 'fabric' || type === 'banner') {
    const customId = `fabric-loader-${ver}-${mcVersion}`;
    const versionDir = path.join(gameDir, 'versions', customId);
    const versionJsonPath = path.join(versionDir, `${customId}.json`);

    if (!fs.existsSync(versionJsonPath)) {
      event?.sender.send('launch-log', { type: 'info', msg: `⬇️ Descargando perfil de Fabric Loader ${ver}...` });
      await fs.ensureDir(versionDir);
      const profileUrl = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${ver}/profile/json`;
      const profileJson = await fetchRemoteJson(profileUrl);
      await fs.writeJson(versionJsonPath, profileJson, { spaces: 2 });
      event?.sender.send('launch-log', { type: 'info', msg: `✅ Fabric Loader ${ver} listo.` });
    } else {
      event?.sender.send('launch-log', { type: 'info', msg: `⚡ Fabric Loader ${ver} verificado en caché.` });
    }

    return {
      customVersion: customId,
      extraJvmArgs: [],
      forgeInstaller: null
    };
  }

  // ── CASO 4: QUILT ──
  if (type === 'quilt') {
    const customId = `quilt-loader-${ver}-${mcVersion}`;
    const versionDir = path.join(gameDir, 'versions', customId);
    const versionJsonPath = path.join(versionDir, `${customId}.json`);

    if (!fs.existsSync(versionJsonPath)) {
      event?.sender.send('launch-log', { type: 'info', msg: `⬇️ Descargando perfil de Quilt Loader ${ver}...` });
      await fs.ensureDir(versionDir);
      const profileUrl = `https://meta.quiltmc.org/v3/versions/loader/${mcVersion}/${ver}/profile/json`;
      const profileJson = await fetchRemoteJson(profileUrl);
      await fs.writeJson(versionJsonPath, profileJson, { spaces: 2 });
      event?.sender.send('launch-log', { type: 'info', msg: `✅ Quilt Loader ${ver} listo.` });
    } else {
      event?.sender.send('launch-log', { type: 'info', msg: `⚡ Quilt Loader ${ver} verificado en caché.` });
    }

    return {
      customVersion: customId,
      extraJvmArgs: [],
      forgeInstaller: null
    };
  }

  // ── CASO 5: VANILLA O GESTORES DE PLUGINS DE SERVIDOR (Paper, Purpur, Spigot, Folia, Bukkit, Velocity, etc.) ──
  event?.sender.send('launch-log', { type: 'info', msg: `⚡ Modo de cliente activo: ${loader.display} (Cliente estándar ${mcVersion}).` });
  return {
    customVersion: null,
    extraJvmArgs: [],
    forgeInstaller: null
  };
}

// ============================================================================
// 12. LANZADOR DE MINECRAFT CON PROTECCIONES
// ============================================================================
ipcMain.handle('launch-game', async (event, { session, ram }) => {
  if (isGameRunning) {
    return { error: 'El juego ya se está iniciando o ejecutando.' };
  }

  isGameRunning = true;
  const cfg = loadConfig();
  const activeLoader = getActiveLoader(cfg);
  const mcVersion = cfg.minecraft?.version || '1.21.1';
  const gameDir = path.join(app.getPath('home'), cfg.launcher?.gameDataFolder || '.doraland');

  try {
    await fs.ensureDir(gameDir);
    await fs.ensureDir(path.join(gameDir, 'mods'));

    if (!session || !session.name) {
      isGameRunning = false;
      return { error: 'Sesión no válida. Por favor inicia sesión de nuevo.' };
    }

    event.sender.send('launch-log', { type: 'info', msg: `🔍 Verificando entorno de Java 21 para ${activeLoader.display}...` });
    const javaCheck = await findAndValidateJava();
    if (!javaCheck.valid) {
      isGameRunning = false;
      event.sender.send('launch-status', {
        status: 'error',
        message: `${javaCheck.reason} Por favor instala Java 21 para jugar ${activeLoader.display}.`
      });
      return;
    }

    event.sender.send('launch-log', { type: 'info', msg: `☕ Java 21 válido detectado: ${javaCheck.path}` });

    // 1. Sincronizar overrides del modpack (config/, defaultconfigs/, shaderpacks/, FancyMenu)
    await syncOverridesProtected(gameDir, cfg, event);

    // 2. Sincronizar mods (remoto o local según config)
    if (cfg.mods?.enabled) {
      await syncModsProtected(gameDir, cfg, event);
    }

    // 3. Asegurar instalación del gestor activo (actualmente NeoForge 21.1.250)
    const loaderSetup = await ensureActiveLoaderInstalled(gameDir, mcVersion, activeLoader, javaCheck.path, event);

    const totalMb = Math.round(os.totalmem() / 1024 / 1024);
    const safeMaxMb = Math.max(2048, totalMb - 1536);
    const safeRam = Math.min(safeMaxMb, Math.max(2048, parseInt(ram) || cfg.minecraft?.recommendedRamMb || 6144));
    const minRam = Math.max(1024, Math.floor(safeRam / 2));

    event.sender.send('launch-log', { type: 'info', msg: `📊 Asignando RAM: ${safeRam}MB (Mínimo: ${minRam}MB)` });

    const jvmArgs = [
      ...(cfg.minecraft?.jvmArgs || []),
      ...(loaderSetup.extraJvmArgs || [])
    ];

    const opts = {
      authorization: session,
      root: gameDir,
      version: {
        number: mcVersion,
        type: 'release'
      },
      memory: {
        max: `${safeRam}M`,
        min: `${minRam}M`
      },
      javaPath: javaCheck.path,
      customArgs: jvmArgs,
      overrides: {
        assetIndex: mcVersion
      }
    };

    if (loaderSetup.customVersion) {
      opts.version.custom = loaderSetup.customVersion;
    }

    if (loaderSetup.forgeInstaller && fs.existsSync(loaderSetup.forgeInstaller)) {
      opts.forge = loaderSetup.forgeInstaller;
    }

    // Auto-conexión al servidor en Minecraft 1.21.1 (QuickPlay Multiplayer)
    if (cfg.server?.autoConnect !== false && cfg.server?.ip) {
      const cleanIp = String(cfg.server.ip).replace(/[^a-zA-Z0-9.-]/g, '');
      const cleanPort = parseInt(cfg.server.port) || 25565;
      opts.quickPlay = {
        type: 'multiplayer',
        identifier: `${cleanIp}:${cleanPort}`
      };
    }

    const { Client } = require('minecraft-launcher-core');
    const launcher = new Client();

    launcher.on('debug', (msg) => event.sender.send('launch-log', { type: 'debug', msg }));
    launcher.on('data', (msg) => event.sender.send('launch-log', { type: 'data', msg }));
    launcher.on('progress', (progress) => event.sender.send('launch-progress', progress));

    launcher.on('close', (code) => {
      isGameRunning = false;
      event.sender.send('launch-close', code);
      appendLauncherLog(`Minecraft cerrado con código: ${code}`);
    });

    appendLauncherLog(`Lanzando Minecraft ${mcVersion} (${activeLoader.display}) para el usuario: ${session.name}`);
    await launcher.launch(opts);
    event.sender.send('launch-status', { status: 'launched', loader: activeLoader.display });

    if (getStore().get('closeOnLaunch', false)) {
      setTimeout(() => app.quit(), 2500);
    }
  } catch (err) {
    isGameRunning = false;
    appendLauncherLog(`Error al lanzar Minecraft: ${err.message}`);
    event.sender.send('launch-status', { status: 'error', message: err.message });
  }
});
