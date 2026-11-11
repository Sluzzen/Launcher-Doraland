// === PROCESO PRINCIPAL (main.js) - Doraland Launcher ===
// Incluye:
// 1. Auto-actualización de Launcher (electron-updater con GitHub Releases)
// 2. Auto-actualización de Mods y Config remota (Sincronización de Manifiesto en GitHub/Hosting)
// 3. Suite completa de protecciones, validaciones e integridad

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const https = require('https');
const os = require('os');
const { spawnSync, execSync } = require('child_process');
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
// 2. CONFIGURACIÓN PREDETERMINADA Y DEFENSA ANTE ARCHIVOS CORRUPTOS
// ============================================================================
const DEFAULT_CONFIG = {
  server: {
    name: "Doraland",
    ip: "doralandmc.holyhosting.club",
    port: 25565,
    autoConnect: true,
    description: "Servidor de Minecraft Forge 1.21.1"
  },
  minecraft: {
    version: "1.21.1",
    forgeVersion: "1.21.1-52.0.47",
    recommendedRamMb: 4096,
    minRamMb: 2048,
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
    source: "auto", // "auto" (prioriza remoto si está configurado, o local bundled), "remote", "bundled"
    remoteManifestUrl: "", // URL directa a mods-manifest.json en GitHub Raw o hosting
    cleanOldMods: true
  },
  updates: {
    autoUpdateLauncher: true,
    githubOwner: "Doraland",
    githubRepo: "launcher-doraland"
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
        minecraft: { ...DEFAULT_CONFIG.minecraft, ...(parsed.minecraft || {}) },
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

  // Comprobar actualizaciones automáticamente al iniciar si está empaquetado
  if (app.isPackaged && launcherConfig?.updates?.autoUpdateLauncher !== false) {
    setTimeout(() => {
      try {
        autoUpdater.checkForUpdates().catch(() => {});
      } catch {}
    }, 3000);
  }
}

// IPCs para el auto-updater del launcher
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

ipcMain.handle('get-config', () => loadConfig());

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
  const totalMb = Math.round(os.totalmem() / 1024 / 1024);
  const safeMaxMb = Math.max(2048, totalMb - 1536);
  const savedRam = getStore().get('ram', launcherConfig?.minecraft?.recommendedRamMb || 4096);
  const clampedRam = Math.min(safeMaxMb, Math.max(1024, savedRam));

  return {
    ram: clampedRam,
    closeOnLaunch: getStore().get('closeOnLaunch', false)
  };
});

ipcMain.handle('save-settings', (_, settings) => {
  if (settings && typeof settings === 'object') {
    const totalMb = Math.round(os.totalmem() / 1024 / 1024);
    const safeMaxMb = Math.max(2048, totalMb - 1536);
    const safeRam = Math.min(safeMaxMb, Math.max(1024, parseInt(settings.ram) || 4096));

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
// 6. IPC HANDLERS: AUTENTICACIÓN
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
        reason: `Java ${major} detectado. Forge 1.21.1 requiere obligatoriamente Java 21+`,
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

// Validación de cabecera JAR (PK\x03\x04)
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
// 9. SINCRONIZACIÓN DE MODS HÍBRIDA (REMOTA Y LOCAL BUNDLED)
// ============================================================================
async function syncModsProtected(gameDir, cfg, event) {
  const targetModsPath = path.join(gameDir, 'mods');
  await fs.ensureDir(targetModsPath);

  // 1. SI HAY MANIFIESTO REMOTO CONFIGURADO (Actualización automática remota)
  if (cfg.mods?.remoteManifestUrl && cfg.mods?.source !== 'bundled') {
    try {
      event?.sender.send('launch-log', { type: 'info', msg: '🌐 Conectando con el servidor para buscar actualizaciones de mods...' });
      const manifest = await fetchRemoteJson(cfg.mods.remoteManifestUrl);

      if (manifest && Array.isArray(manifest.mods)) {
        event?.sender.send('launch-log', { type: 'info', msg: `📦 Manifiesto remoto recibido: ${manifest.mods.length} mods disponibles.` });
        
        // Actualizar IP o Forge en vivo si el manifiesto lo especifica
        if (manifest.server?.ip) cfg.server.ip = manifest.server.ip;
        if (manifest.minecraft?.forgeVersion) cfg.minecraft.forgeVersion = manifest.minecraft.forgeVersion;

        await syncRemoteModsList(manifest.mods, targetModsPath, cfg, event);
        return;
      }
    } catch (err) {
      event?.sender.send('launch-log', { type: 'warn', msg: `⚠️ Servidor remoto no disponible (${err.message}). Usando respaldo local.` });
    }
  }

  // 2. RESPALDO LOCAL (MODS BUNDLED)
  await syncLocalBundledMods(targetModsPath, cfg, event);
}

// Sincronización remota desde manifiesto
async function syncRemoteModsList(remoteMods, targetModsPath, cfg, event) {
  const remoteNames = remoteMods.map(m => m.name.toLowerCase());

  // Limpieza de mods eliminados del servidor
  if (cfg.mods?.cleanOldMods) {
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

      // Resolver URL de descarga (absoluta o relativa a la URL del manifest)
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
    event?.sender.send('launch-log', { type: 'info', msg: `✔️ Todos los mods remotos están al día (${remoteMods.length} mods).` });
  } else {
    event?.sender.send('launch-log', { type: 'info', msg: `🎉 Se actualizaron ${updatedCount} mods automáticamente.` });
  }
}

// Sincronización local de la carpeta mods/
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
    event?.sender.send('launch-log', { type: 'warn', msg: 'Carpeta mods/ local no encontrada.' });
    return;
  }

  event?.sender.send('launch-log', { type: 'info', msg: '📦 Sincronizando mods desde el paquete local...' });

  const rawFiles = await fs.readdir(bundledModsPath);
  const bundledJars = rawFiles.filter(f => f.toLowerCase().endsWith('.jar'));

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
// 10. FORGE 1.21.1 INSTALLER
// ============================================================================
async function ensureForgeProtected(gameDir, rawVersion, event) {
  const version = rawVersion.includes('-') ? rawVersion : `1.21.1-${rawVersion}`;
  const installersDir = path.join(gameDir, 'installers');
  await fs.ensureDir(installersDir);

  const installerName = `forge-${version}-installer.jar`;
  const installerPath = path.join(installersDir, installerName);

  if (fs.existsSync(installerPath) && isValidJarFile(installerPath)) {
    event?.sender.send('launch-log', { type: 'info', msg: `🔨 Forge ${version} verificado en caché.` });
    return installerPath;
  }

  event?.sender.send('launch-log', { type: 'info', msg: `⬇️ Descargando instalador de Forge ${version}...` });

  const downloadUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${version}/${installerName}`;

  await downloadFile(downloadUrl, installerPath, (pct) => {
    event?.sender.send('launch-progress', {
      type: `Forge 1.21.1 Installer`,
      task: pct,
      total: 100
    });
  });

  if (!isValidJarFile(installerPath)) {
    await fs.remove(installerPath);
    throw new Error('Instalador de Forge corrupto.');
  }

  event?.sender.send('launch-log', { type: 'info', msg: `✅ Forge ${version} listo.` });
  return installerPath;
}

// ============================================================================
// 11. LANZADOR DE MINECRAFT CON PROTECCIONES
// ============================================================================
ipcMain.handle('launch-game', async (event, { session, ram }) => {
  if (isGameRunning) {
    return { error: 'El juego ya se está iniciando o ejecutando.' };
  }

  isGameRunning = true;
  const cfg = loadConfig();
  const gameDir = path.join(app.getPath('home'), cfg.launcher?.gameDataFolder || '.doraland');

  try {
    await fs.ensureDir(gameDir);
    await fs.ensureDir(path.join(gameDir, 'mods'));

    if (!session || !session.name) {
      isGameRunning = false;
      return { error: 'Sesión no válida. Por favor inicia sesión de nuevo.' };
    }

    event.sender.send('launch-log', { type: 'info', msg: '🔍 Verificando entorno de Java 21...' });
    const javaCheck = await findAndValidateJava();
    if (!javaCheck.valid) {
      isGameRunning = false;
      event.sender.send('launch-status', {
        status: 'error',
        message: `${javaCheck.reason} Por favor instala Java 21 para jugar Forge 1.21.1.`
      });
      return;
    }

    event.sender.send('launch-log', { type: 'info', msg: `☕ Java 21 válido detectado: ${javaCheck.path}` });

    // Sincronizar mods (remoto o local según config)
    if (cfg.mods?.enabled) {
      await syncModsProtected(gameDir, cfg, event);
    }

    const forgeVersion = cfg.minecraft?.forgeVersion || '1.21.1-52.0.47';
    let forgeInstaller = null;
    try {
      forgeInstaller = await ensureForgeProtected(gameDir, forgeVersion, event);
    } catch (err) {
      event.sender.send('launch-log', { type: 'warn', msg: `Aviso Forge: ${err.message}` });
    }

    const totalMb = Math.round(os.totalmem() / 1024 / 1024);
    const safeMaxMb = Math.max(2048, totalMb - 1536);
    const safeRam = Math.min(safeMaxMb, Math.max(1024, parseInt(ram) || 4096));
    const minRam = Math.max(512, Math.floor(safeRam / 2));

    event.sender.send('launch-log', { type: 'info', msg: `📊 Asignando RAM: ${safeRam}MB (Mínimo: ${minRam}MB)` });

    const jvmArgs = [...(cfg.minecraft?.jvmArgs || [])];
    const customLaunchArgs = [];

    if (cfg.server?.autoConnect !== false && cfg.server?.ip) {
      customLaunchArgs.push('--server', String(cfg.server.ip).replace(/[^a-zA-Z0-9.-]/g, ''));
      if (cfg.server.port && cfg.server.port !== 25565) {
        customLaunchArgs.push('--port', String(parseInt(cfg.server.port) || 25565));
      }
    }

    const opts = {
      authorization: session,
      root: gameDir,
      version: {
        number: cfg.minecraft?.version || '1.21.1',
        type: 'release'
      },
      memory: {
        max: `${safeRam}M`,
        min: `${minRam}M`
      },
      javaPath: javaCheck.path,
      customArgs: jvmArgs,
      customLaunchArgs: customLaunchArgs
    };

    if (forgeInstaller && fs.existsSync(forgeInstaller)) {
      opts.forge = forgeInstaller;
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

    appendLauncherLog(`Lanzando Minecraft Forge 1.21.1 para el usuario: ${session.name}`);
    await launcher.launch(opts);
    event.sender.send('launch-status', { status: 'launched' });

    if (getStore().get('closeOnLaunch', false)) {
      setTimeout(() => app.quit(), 2500);
    }
  } catch (err) {
    isGameRunning = false;
    appendLauncherLog(`Error al lanzar Minecraft: ${err.message}`);
    event.sender.send('launch-status', { status: 'error', message: err.message });
  }
});
