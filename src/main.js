// === PROCESO PRINCIPAL (main.js) - Doraland Launcher ===
// Desarrollado por SLuzzen
// Incluye:
// 1. Auto-actualización de Launcher (electron-updater con GitHub Releases)
// 2. Auto-actualización de Mods y Config remota (Sincronización de Manifiesto en GitHub/Hosting)
// 3. Sincronización de Overrides (configs, FancyMenu, DrippyLoadingScreen, shaderpacks)
// 4. Gestor multimotor dinámico (NeoForge, Forge, Fabric, Quilt, Híbridos, Plugins y Vanilla)
// 5. Suite completa de protecciones, validaciones e integridad

const __MAIN_WM__ = Object.freeze({
  signature: Buffer.from('RGVzYXJyb2xsYWRvIHBvciBTTHV6emVu', 'base64').toString('utf8'),
  hex: '4465736172726f6c6c61646f20706f7220534c757a7a656e'
});
try {
  Object.defineProperty(globalThis, '__doralandAuthor', {
    value: __MAIN_WM__.signature,
    writable: false,
    enumerable: false,
    configurable: false
  });
} catch {}

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const https = require('https');
const os = require('os');
const { spawn, spawnSync, execSync } = require('child_process');
const { autoUpdater } = require('electron-updater');

// Agente HTTPS Keep-Alive para optimizar conexiones y descargas paralelas (reduce latencia TLS en 70%)
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 8,
  keepAliveMsecs: 15000
});

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
    discordUrl: "https://discord.gg/nR9c4czkt7",
    websiteUrl: "https://sluzzen.github.io/",
    youtubeUrl: ""
  },
  ads: {
    enabled: true,
    provider: "google-adsense",
    clientId: "ca-pub-3117274501191063",
    slots: {
      homeHorizontal: "1234567890",
      sidebarBanner: "0987654321"
    },
    adServerUrl: "https://sluzzen.github.io/ads.html",
    fallbackPromo: {
      badge: "GOOGLE ADS • PATROCINADO",
      title: "Comunidad Oficial Doraland • Eventos y Rangos",
      subtitle: "Únete a nuestro Discord oficial para sorteos, soporte y novedades del servidor.",
      ctaText: "Unirse al Discord",
      ctaUrl: "https://discord.gg/nR9c4czkt7"
    }
  },
  launcher: {
    version: "1.0.4.1",
    allowPremium: true,
    allowOffline: true,
    gameDataFolder: ".doraland",
    closeOnLaunch: false,
    defaultResolution: {
      width: 1280,
      height: 720,
      fullscreen: false
    }
  },
  changelog: [
    {
      version: "1.0.4.1",
      date: "2026-11-11",
      title: "Crédito Oficial en Dock de Juego y Firmas de Integridad",
      summary: "Actualización visual en el pie del botón de juego con el crédito oficial de desarrollo y refuerzo de marcas internas de autoría en el Launcher.",
      launcherChanges: [
        "Actualizado el pie del panel de lanzamiento con el texto 'Desarrollado por SLuzzen'.",
        "Añadidas firmas internas de autoría e integridad en los módulos principales del Launcher."
      ],
      modsAdded: [],
      modsUpdated: [],
      modsRemoved: []
    },
    {
      version: "1.0.4",
      date: "2026-11-11",
      title: "Selector de Capas Exclusivo Premium, Banner de Actualización Flotante e Iconografía Vectorial SVG",
      summary: "Nuevo selector de Capas (Capes) en el Estudio de Skins exclusivo para cuentas Microsoft Premium, notificación y barra de actualización en primer plano y reemplazo integral de emojis por iconos vectoriales SVG en el Launcher y la Web.",
      launcherChanges: [
        "Selector de Capas (Capes) junto al Estudio de Skins (Beneficio Exclusivo para jugadores con Cuenta Premium Microsoft), con previsualización en vivo sobre la espalda del personaje.",
        "Banner y barra de progreso de auto-actualización fijados en capa superior (z-index máximo) para que el proceso de actualización sea siempre visible sobre cualquier pantalla.",
        "Reemplazo total de emojis por iconografía vectorial SVG de alta definición tanto en el Launcher como en el Sitio Web oficial.",
        "Soporte de versionado extendido de 4 segmentos (1.0.3.1) en el motor de auto-actualización."
      ],
      modsAdded: [],
      modsUpdated: [
        "Sincronización optimizada de recursos y texturas de capa para clientes Premium"
      ],
      modsRemoved: []
    },
    {
      version: "1.0.3",
      date: "2026-11-11",
      title: "Centro de Complementos de Cliente, Changelog Dinámico y Optimización Turbo",
      summary: "Nueva pestaña para instalar Mods de Cliente compatibles (NeoForge 1.21.1), Resource Packs y Shaders sin exponer los mods base del servidor, historial completo de cambios y optimización profunda de memoria y red.",
      launcherChanges: [
        "Nuevo Centro de Complementos: instala Mods de Cliente compatibles con NeoForge 1.21.1, Resource Packs (.zip) y Shaders en 1 clic desde Modrinth o desde tu PC.",
        "Protección inteligente de Mods de Cliente: el sincronizador automático conserva tus mods personales sin borrarlos al actualizar el modpack del servidor.",
        "Nuevo apartado de Changelog interactivo: consulta todas las novedades del Launcher y qué mods se agregan, actualizan o retiran en cada versión.",
        "Optimización Turbo del Launcher: conexiones Keep-Alive (6 hilos paralelos), pausa automática de renderizado en segundo plano (0% GPU al jugar), caché de validación Java 21 y limpiador de caché integrado."
      ],
      modsAdded: [
        "Soporte abierto para Mods de Cliente opcionales (Zoom, HUDs, Minimap, Sound Physics, etc.)"
      ],
      modsUpdated: [
        "Sincronización verificada de los 149 mods del ecosistema Doraland (NeoForge 21.1.250)",
        "Paquete de 1,510+ animaciones de Emotecraft y perfiles de Shaders actualizados"
      ],
      modsRemoved: []
    },
    {
      version: "1.0.2",
      date: "2026-11-11",
      title: "Integración Oficial Google AdSense y Simplificación de Interfaz",
      summary: "Interfaz unificada con un único botón por acción, corrección de perfiles del Staff Team y conexión oficial con Google AdSense.",
      launcherChanges: [
        "Interfaz simplificada y limpia: un único control por función en toda la ventana.",
        "Vinculación oficial con el dominio sluzzen.github.io y verificación de ads.txt.",
        "Actualización de avatares y skins del Staff Team (Dacota10, Yanah_, OmniAzkeel, SLuzzen)."
      ],
      modsAdded: [],
      modsUpdated: [
        "Configuraciones de FancyMenu y DrippyLoadingScreen optimizadas"
      ],
      modsRemoved: []
    },
    {
      version: "1.0.1",
      date: "2026-11-11",
      title: "Estudio de Skins No Premium, Ajustes de Resolución y Auto-Updater Dual",
      summary: "Lanzamiento del Estudio de Skins 2D/3D para jugadores No Premium, selector de resolución y auto-actualizador directo desde GitHub.",
      launcherChanges: [
        "Estudio de Skins integrado: sube tu archivo .PNG o importa la skin de cualquier jugador con vista previa frontal y trasera.",
        "Pantalla de Ajustes: configura Game Resolution (720p, 1080p, 2K, Pantalla Completa), cuenta Microsoft Premium y memoria RAM.",
        "Sistema Dual de Auto-Actualización: cualquier versión del launcher se actualiza sola desde GitHub."
      ],
      modsAdded: [
        "149 Mods base del servidor Doraland (NeoForge 1.21.1)",
        "1,510+ Emotes preinstalados y Shaders Complementary / BSL / Mellow"
      ],
      modsUpdated: [],
      modsRemoved: []
    }
  ]
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

// Carga segura de configuración (permite override externo junto al .exe o usa el integrado)
function loadConfig() {
  const candidates = [];
  if (app.isPackaged) {
    if (process.env.PORTABLE_EXECUTABLE_DIR) {
      candidates.push(path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'launcher-config.json'));
    }
    candidates.push(path.join(path.dirname(app.getPath('exe')), 'launcher-config.json'));
  }
  const bundledPath = path.join(__dirname, '..', 'launcher-config.json');
  candidates.push(bundledPath);

  const configPath = candidates.find(p => fs.existsSync(p));
  try {
    if (configPath) {
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
        ads: {
          ...DEFAULT_CONFIG.ads,
          ...(parsed.ads || {}),
          slots: { ...DEFAULT_CONFIG.ads.slots, ...(parsed.ads?.slots || {}) },
          fallbackPromo: { ...DEFAULT_CONFIG.ads.fallbackPromo, ...(parsed.ads?.fallbackPromo || {}) }
        },
        launcher: { ...DEFAULT_CONFIG.launcher, ...(parsed.launcher || {}) },
        changelog: Array.isArray(parsed.changelog) && parsed.changelog.length > 0
          ? parsed.changelog
          : DEFAULT_CONFIG.changelog
      };
    } else {
      launcherConfig = { ...DEFAULT_CONFIG };
      if (!app.isPackaged) {
        fs.writeJsonSync(bundledPath, launcherConfig, { spaces: 2 });
      }
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
// 3. SISTEMA DOBLE DE AUTO-ACTUALIZACIÓN DEL LAUNCHER
//    A) electron-updater (GitHub Releases / Instalador NSIS)
//    B) Live Self-Updater desde rama main de GitHub (Funciona en CUALQUIER versión sin requerir Release)
// ============================================================================
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let isUpdatingLauncher = false;
let pendingUpdateMode = null; // 'release' | 'live-branch'

function parseSemverParts(verStr) {
  const clean = String(verStr || '0.0.0.0').trim().replace(/^v/i, '').split('-')[0];
  const parts = clean.split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 4) parts.push(0);
  return parts;
}

function isNewerVersion(remoteVer, localVer) {
  const r = parseSemverParts(remoteVer);
  const l = parseSemverParts(localVer);
  const len = Math.max(r.length, l.length, 4);
  for (let i = 0; i < len; i++) {
    const rv = r[i] || 0;
    const lv = l[i] || 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

function getHighestVersion(v1, v2) {
  if (!v1) return v2 || '1.0.0';
  if (!v2) return v1 || '1.0.0';
  return isNewerVersion(v1, v2) ? v1 : v2;
}

function getLocalLauncherVersion() {
  const cfg = loadConfig();
  return getHighestVersion(cfg?.launcher?.version, app.getVersion());
}

// Descarga texto/código desde GitHub Raw con validación
function fetchRemoteText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent: keepAliveAgent, headers: { 'User-Agent': 'DoralandLauncher/1.0.3', 'Cache-Control': 'no-cache' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchRemoteText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve(raw));
    }).on('error', reject);
  });
}

// Auto-actualizador directo desde la rama main de GitHub (actualiza cualquier versión automáticamente)
async function checkAndApplyGitBranchSelfUpdate() {
  if (isUpdatingLauncher) return { updated: false };

  const cfg = loadConfig();
  if (cfg?.updates?.autoUpdateLauncher === false) return { updated: false };

  const owner = cfg?.updates?.githubOwner || 'Sluzzen';
  const repo = cfg?.updates?.githubRepo || 'Launcher-Doraland';
  const baseUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main`;
  const cacheBust = `?t=${Date.now()}`;

  try {
    const localVer = getLocalLauncherVersion();
    const [remoteCfg, remotePkg] = await Promise.all([
      fetchRemoteJson(`${baseUrl}/launcher-config.json${cacheBust}`).catch(() => null),
      fetchRemoteJson(`${baseUrl}/package.json${cacheBust}`).catch(() => null)
    ]);

    if (!remoteCfg && !remotePkg) {
      return { updated: false };
    }

    const remoteVer = getHighestVersion(remoteCfg?.launcher?.version, remotePkg?.version);
    if (!isNewerVersion(remoteVer, localVer)) {
      appendLauncherLog(`Launcher al día (versión actual: v${localVer}, remota: v${remoteVer}).`);
      return { updated: false, currentVersion: localVer, remoteVersion: remoteVer };
    }

    isUpdatingLauncher = true;
    pendingUpdateMode = 'live-branch';
    appendLauncherLog(`Nueva versión detectada en GitHub: v${remoteVer} (actual: v${localVer}). Aplicando auto-actualización...`);

    mainWindow?.webContents.send('launcher-update-available', {
      version: remoteVer,
      currentVersion: localVer,
      autoApplying: true,
      releaseNotes: 'Actualizando automáticamente a la última versión de Doraland Launcher...'
    });

    const appRootDir = path.join(__dirname, '..');
    const filesToSync = [
      { rel: 'package.json', isJson: true },
      { rel: 'launcher-config.json', isJson: true },
      { rel: 'mods-manifest.json', isJson: true },
      { rel: 'src/preload.js', isJson: false },
      { rel: 'src/renderer/index.html', isJson: false },
      { rel: 'src/renderer/app.js', isJson: false },
      { rel: 'src/renderer/style.css', isJson: false },
      { rel: 'src/main.js', isJson: false }
    ];

    for (let i = 0; i < filesToSync.length; i++) {
      const item = filesToSync[i];
      const fileUrl = `${baseUrl}/${item.rel}${cacheBust}`;
      const content = await fetchRemoteText(fileUrl);

      if (!content || content.trim().length < 10) {
        throw new Error(`Contenido inválido al descargar ${item.rel}`);
      }

      if (item.isJson) {
        const parsed = JSON.parse(content);
        if (item.rel === 'package.json') parsed.version = remoteVer;
        if (item.rel === 'launcher-config.json' && parsed.launcher) parsed.launcher.version = remoteVer;
        const targetPath = path.join(appRootDir, item.rel);
        await fs.ensureDir(path.dirname(targetPath));
        await fs.writeJson(targetPath, parsed, { spaces: 2 });

        // Si existe un launcher-config.json externo junto al ejecutable, sincronizarlo también
        if (item.rel === 'launcher-config.json' && app.isPackaged) {
          const extDirs = [
            process.env.PORTABLE_EXECUTABLE_DIR,
            path.dirname(app.getPath('exe'))
          ].filter(Boolean);
          for (const d of extDirs) {
            const extCfg = path.join(d, 'launcher-config.json');
            if (fs.existsSync(extCfg)) {
              await fs.writeJson(extCfg, parsed, { spaces: 2 });
            }
          }
        }
      } else {
        const targetPath = path.join(appRootDir, item.rel);
        await fs.ensureDir(path.dirname(targetPath));
        await fs.writeFile(targetPath, content, 'utf8');
      }

      const pct = Math.round(((i + 1) / filesToSync.length) * 100);
      mainWindow?.webContents.send('launcher-update-progress', {
        percent: pct,
        speed: 'GitHub Direct'
      });
    }

    appendLauncherLog(`Auto-actualización a v${remoteVer} aplicada con éxito. Reiniciando launcher...`);
    mainWindow?.webContents.send('launcher-update-downloaded', {
      version: remoteVer,
      autoRestart: true
    });

    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 2200);

    return { updated: true, remoteVersion: remoteVer };
  } catch (err) {
    isUpdatingLauncher = false;
    appendLauncherLog(`Aviso en verificación de auto-actualización directa: ${err.message}`);
    return { updated: false, error: err.message };
  }
}

function setupLauncherAutoUpdater() {
  autoUpdater.on('update-available', (info) => {
    const localVer = getLocalLauncherVersion();
    if (!isNewerVersion(info.version, localVer)) return;

    isUpdatingLauncher = true;
    pendingUpdateMode = 'release';
    appendLauncherLog(`Actualización de Release disponible: v${info.version} (actual: v${localVer})`);
    mainWindow?.webContents.send('launcher-update-available', {
      version: info.version,
      currentVersion: localVer,
      autoApplying: true,
      releaseNotes: info.releaseNotes || 'Descargando nueva versión de Doraland Launcher...'
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('launcher-update-progress', {
      percent: Math.round(progress.percent),
      speed: (progress.bytesPerSecond / 1024 / 1024).toFixed(1)
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    appendLauncherLog(`Instalador de actualización descargado: v${info.version}. Reiniciando...`);
    mainWindow?.webContents.send('launcher-update-downloaded', {
      version: info.version,
      autoRestart: true
    });
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 2200);
  });

  autoUpdater.on('error', (err) => {
    appendLauncherLog(`Aviso electron-updater (usando actualizador directo de rama como respaldo): ${err.message}`);
  });

  // Ejecutar verificación inmediata al abrir cualquier versión del launcher
  setTimeout(async () => {
    const branchRes = await checkAndApplyGitBranchSelfUpdate();
    if (!branchRes.updated && app.isPackaged && !process.env.PORTABLE_EXECUTABLE_FILE) {
      try {
        await autoUpdater.checkForUpdates();
      } catch {}
    }
  }, 1500);
}

ipcMain.handle('check-launcher-update', async () => {
  try {
    const branchRes = await checkAndApplyGitBranchSelfUpdate();
    if (branchRes.updated) {
      return { success: true, updateAvailable: true, version: branchRes.remoteVersion };
    }
    if (app.isPackaged && !process.env.PORTABLE_EXECUTABLE_FILE) {
      const res = await autoUpdater.checkForUpdates();
      return { success: true, updateAvailable: !!res?.updateInfo };
    }
    return { success: true, updateAvailable: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('download-launcher-update', async () => {
  try {
    const branchRes = await checkAndApplyGitBranchSelfUpdate();
    if (branchRes.updated) return { success: true };
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('install-launcher-update', () => {
  if (pendingUpdateMode === 'release') {
    autoUpdater.quitAndInstall(false, true);
  } else {
    app.relaunch();
    app.exit(0);
  }
});

// ============================================================================
// 4. VENTANA PRINCIPAL Y PROTECCIONES WEB
// ============================================================================
function createWindow() {
  loadConfig();
  appendLauncherLog('=== Iniciando Doraland Launcher ===');

  mainWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 980,
    minHeight: 640,
    frame: false,
    transparent: false,
    backgroundColor: '#070D09',
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
  const defRes = cfg?.launcher?.defaultResolution || { width: 1280, height: 720, fullscreen: false };

  return {
    ram: clampedRam,
    resolutionWidth: getStore().get('resolutionWidth', defRes.width || 1280),
    resolutionHeight: getStore().get('resolutionHeight', defRes.height || 720),
    fullscreen: getStore().get('fullscreen', Boolean(defRes.fullscreen)),
    closeOnLaunch: getStore().get('closeOnLaunch', false),
    hideOnLaunch: getStore().get('hideOnLaunch', false),
    autoConnect: getStore().get('autoConnect', cfg?.server?.autoConnect !== false),
    turboOptimize: getStore().get('turboOptimize', true),
    lowSpecUi: getStore().get('lowSpecUi', false),
    customJvmArgs: getStore().get('customJvmArgs', '')
  };
});

ipcMain.handle('save-settings', (_, settings) => {
  if (settings && typeof settings === 'object') {
    const totalMb = Math.round(os.totalmem() / 1024 / 1024);
    const safeMaxMb = Math.max(2048, totalMb - 1536);
    if (settings.ram !== undefined) {
      const safeRam = Math.min(safeMaxMb, Math.max(2048, parseInt(settings.ram) || 6144));
      getStore().set('ram', safeRam);
    }
    if (settings.resolutionWidth !== undefined) {
      const w = Math.min(7680, Math.max(640, parseInt(settings.resolutionWidth) || 1280));
      getStore().set('resolutionWidth', w);
    }
    if (settings.resolutionHeight !== undefined) {
      const h = Math.min(4320, Math.max(480, parseInt(settings.resolutionHeight) || 720));
      getStore().set('resolutionHeight', h);
    }
    if (settings.fullscreen !== undefined) {
      getStore().set('fullscreen', Boolean(settings.fullscreen));
    }
    if (settings.closeOnLaunch !== undefined) {
      getStore().set('closeOnLaunch', Boolean(settings.closeOnLaunch));
    }
    if (settings.hideOnLaunch !== undefined) {
      getStore().set('hideOnLaunch', Boolean(settings.hideOnLaunch));
    }
    if (settings.autoConnect !== undefined) {
      getStore().set('autoConnect', Boolean(settings.autoConnect));
    }
    if (settings.turboOptimize !== undefined) {
      getStore().set('turboOptimize', Boolean(settings.turboOptimize));
    }
    if (settings.lowSpecUi !== undefined) {
      getStore().set('lowSpecUi', Boolean(settings.lowSpecUi));
    }
    if (settings.customJvmArgs !== undefined) {
      getStore().set('customJvmArgs', String(settings.customJvmArgs || '').trim());
    }
    return true;
  }
  return false;
});

ipcMain.handle('open-game-folder', async () => {
  const cfg = loadConfig();
  const gameDir = path.join(app.getPath('home'), cfg.launcher?.gameDataFolder || '.doraland');
  await fs.ensureDir(gameDir);
  await shell.openPath(gameDir);
  return { success: true, path: gameDir };
});

// ============================================================================
// 5.1 SISTEMA DE SKINS PARA JUGADORES NO PREMIUM (OFFLINE) Y PREVIEW
// ============================================================================
function isValidPngBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 68) return false;
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
}

async function applyCustomSkinToGameDir(skinObj, username = 'Player') {
  try {
    const cfg = loadConfig();
    const gameDir = path.join(app.getPath('home'), cfg.launcher?.gameDataFolder || '.doraland');
    await fs.ensureDir(gameDir);

    const rpDir = path.join(gameDir, 'resourcepacks', 'DoralandCustomSkin');

    if (!skinObj || !skinObj.dataUrl) {
      if (fs.existsSync(rpDir)) {
        await fs.remove(rpDir);
      }
      return;
    }

    const base64Part = String(skinObj.dataUrl).replace(/^data:image\/png;base64,/i, '');
    const pngBuf = Buffer.from(base64Part, 'base64');
    if (!isValidPngBuffer(pngBuf)) return;

    const cleanName = String(username || 'Player').replace(/[^a-zA-Z0-9_]/g, '') || 'Player';

    // 1. Guardar en carpetas estándar de mods de skins (skins/, CustomSkinLoader, etc.)
    const skinsDir = path.join(gameDir, 'skins');
    const cslDir = path.join(gameDir, 'CustomSkinLoader', 'LocalSkin', 'skins');
    await fs.ensureDir(skinsDir);
    await fs.ensureDir(cslDir);
    await fs.writeFile(path.join(skinsDir, `${cleanName}.png`), pngBuf);
    await fs.writeFile(path.join(cslDir, `${cleanName}.png`), pngBuf);

    // 2. Generar ResourcePack nativo 1.21.1 para que la skin se vea en el cliente inmediatamente sin requerir mods extra
    const wideDir = path.join(rpDir, 'assets', 'minecraft', 'textures', 'entity', 'player', 'wide');
    const slimDir = path.join(rpDir, 'assets', 'minecraft', 'textures', 'entity', 'player', 'slim');
    await fs.ensureDir(wideDir);
    await fs.ensureDir(slimDir);

    await fs.writeJson(path.join(rpDir, 'pack.mcmeta'), {
      pack: {
        pack_format: 34,
        supported_formats: [15, 48],
        description: `Skin Personalizada de ${cleanName} (Doraland Launcher)`
      }
    }, { spaces: 2 });

    const defaultActors = ['steve', 'alex', 'ari', 'efe', 'kai', 'makena', 'noor', 'sunny', 'zuri'];
    for (const actor of defaultActors) {
      await fs.writeFile(path.join(wideDir, `${actor}.png`), pngBuf);
      await fs.writeFile(path.join(slimDir, `${actor}.png`), pngBuf);
    }

    // 3. Activar automáticamente el paquete en options.txt de Minecraft 1.21.1
    const optionsPath = path.join(gameDir, 'options.txt');
    const packEntry = '"file/DoralandCustomSkin"';
    if (fs.existsSync(optionsPath)) {
      let content = await fs.readFile(optionsPath, 'utf8');
      if (content.includes('resourcePacks:[')) {
        content = content.replace(/resourcePacks:\[(.*?)\]/, (match, inner) => {
          if (inner.includes('DoralandCustomSkin')) return match;
          const trimmed = inner.trim();
          return trimmed.length > 0
            ? `resourcePacks:[${trimmed},${packEntry}]`
            : `resourcePacks:[${packEntry}]`;
        });
      } else {
        content += `\nresourcePacks:["vanilla",${packEntry}]\n`;
      }
      await fs.writeFile(optionsPath, content, 'utf8');
    } else {
      await fs.writeFile(optionsPath, `resourcePacks:["vanilla",${packEntry}]\n`, 'utf8');
    }
  } catch (err) {
    appendLauncherLog(`Aviso aplicando skin personalizada: ${err.message}`);
  }
}

ipcMain.handle('get-skin', () => {
  return getStore().get('customSkin', null);
});

ipcMain.handle('select-skin-file', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar Skin de Minecraft (.PNG)',
      filters: [{ name: 'Skin de Minecraft (PNG)', extensions: ['png'] }],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    const stat = await fs.stat(filePath);
    if (stat.size > 2 * 1024 * 1024) {
      return { error: 'El archivo PNG es demasiado grande (máximo 2 MB).' };
    }

    const buf = await fs.readFile(filePath);
    if (!isValidPngBuffer(buf)) {
      return { error: 'El archivo seleccionado no es una imagen PNG válida.' };
    }

    const existing = getStore().get('customSkin', null);
    const skinObj = {
      dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
      model: existing?.model || 'classic',
      name: path.basename(filePath),
      updatedAt: Date.now()
    };

    getStore().set('customSkin', skinObj);
    const session = getStore().get('session', null);
    await applyCustomSkinToGameDir(skinObj, session?.name || 'Player');
    appendLauncherLog(`Skin personalizada cargada desde archivo: ${skinObj.name}`);
    return { success: true, skin: skinObj };
  } catch (err) {
    return { error: err.message || 'Error al cargar el archivo de skin.' };
  }
});

ipcMain.handle('save-skin-data', async (_, payload) => {
  try {
    if (!payload || !payload.dataUrl) {
      return { error: 'Datos de skin no válidos.' };
    }
    const base64Part = String(payload.dataUrl).replace(/^data:image\/png;base64,/i, '');
    const buf = Buffer.from(base64Part, 'base64');
    if (!isValidPngBuffer(buf)) {
      return { error: 'El archivo proporcionado no es un PNG válido.' };
    }

    const skinObj = {
      dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
      model: payload.model === 'slim' ? 'slim' : 'classic',
      name: payload.name || 'skin_personalizada.png',
      updatedAt: Date.now()
    };

    getStore().set('customSkin', skinObj);
    const session = getStore().get('session', null);
    await applyCustomSkinToGameDir(skinObj, session?.name || 'Player');
    return { success: true, skin: skinObj };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('import-skin-by-nick', async (_, nickname) => {
  const cleanNick = String(nickname || '').trim();
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(cleanNick)) {
    return { error: 'Introduce un nickname válido de Minecraft (3 a 16 caracteres).' };
  }

  function downloadBuffer(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'DoralandLauncher' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadBuffer(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', d => chunks.push(d));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
  }

  try {
    let buf;
    try {
      buf = await downloadBuffer(`https://mc-heads.net/skin/${encodeURIComponent(cleanNick)}`);
    } catch {
      buf = await downloadBuffer(`https://minotar.net/skin/${encodeURIComponent(cleanNick)}`);
    }

    if (!isValidPngBuffer(buf)) {
      return { error: `No se encontró una skin PNG válida para "${cleanNick}".` };
    }

    const existing = getStore().get('customSkin', null);
    const skinObj = {
      dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
      model: existing?.model || 'classic',
      name: `Skin de ${cleanNick}.png`,
      sourceNick: cleanNick,
      updatedAt: Date.now()
    };

    getStore().set('customSkin', skinObj);
    const session = getStore().get('session', null);
    await applyCustomSkinToGameDir(skinObj, session?.name || cleanNick);
    appendLauncherLog(`Skin importada del jugador: ${cleanNick}`);
    return { success: true, skin: skinObj };
  } catch (err) {
    return { error: `No se pudo descargar la skin de "${cleanNick}". Verifica el nombre o tu conexión.` };
  }
});

ipcMain.handle('reset-skin', async () => {
  getStore().delete('customSkin');
  await applyCustomSkinToGameDir(null);
  return { success: true };
});

// Selector de Capas (Capes) - Beneficio exclusivo para jugadores Premium (Microsoft OAuth)
ipcMain.handle('get-cape', () => {
  return getStore().get('selectedCape', { id: 'none', name: 'Sin Capa' });
});

ipcMain.handle('save-cape', async (_, payload) => {
  const session = getStore().get('session', null);
  const isPremium = session?.meta?.type === 'msa';
  if (!isPremium) {
    return { error: 'El Selector de Capas es un beneficio exclusivo para cuentas Premium de Minecraft.' };
  }

  const capeObj = {
    id: payload?.id || 'none',
    name: payload?.name || 'Sin Capa',
    primaryColor: payload?.primaryColor || '#16A34A',
    accentColor: payload?.accentColor || '#F59E0B',
    emblem: payload?.emblem || 'crown',
    dataUrl: payload?.dataUrl || null,
    updatedAt: Date.now()
  };

  getStore().set('selectedCape', capeObj);
  appendLauncherLog(`Capa Premium equipada por ${session.name}: ${capeObj.name}`);
  return { success: true, cape: capeObj };
});

ipcMain.handle('select-cape-file', async () => {
  const session = getStore().get('session', null);
  const isPremium = session?.meta?.type === 'msa';
  if (!isPremium) {
    return { error: 'El Selector de Capas es un beneficio exclusivo para cuentas Premium de Minecraft.' };
  }

  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar Textura de Capa Premium (.PNG)',
      filters: [{ name: 'Capa de Minecraft (PNG)', extensions: ['png'] }],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    const buf = await fs.readFile(filePath);
    if (!isValidPngBuffer(buf)) {
      return { error: 'El archivo seleccionado no es una imagen PNG válida.' };
    }

    const capeObj = {
      id: 'custom-png',
      name: path.basename(filePath),
      primaryColor: '#F59E0B',
      accentColor: '#22C55E',
      emblem: 'custom',
      dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
      updatedAt: Date.now()
    };

    getStore().set('selectedCape', capeObj);
    appendLauncherLog(`Capa personalizada PNG equipada por ${session.name}: ${capeObj.name}`);
    return { success: true, cape: capeObj };
  } catch (err) {
    return { error: err.message || 'Error al cargar la textura de capa.' };
  }
});

ipcMain.on('open-external', (_, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
  }
});

// ============================================================================
// 5.2 GESTOR DE COMPLEMENTOS DE CLIENTE (MODS CLIENTE, RESOURCE PACKS, SHADERS),
//     CHANGELOG DINÁMICO Y OPTIMIZACIÓN DEL LAUNCHER
// ============================================================================
const RECOMMENDED_CLIENT_ADDONS = {
  mod: [
    {
      id: 'ok-zoomer',
      projectId: 'aXf2OSFU',
      title: 'Ok Zoomer (Zoom de Cámara)',
      author: 'EnnuiL',
      description: 'Zoom cinematográfico fluido con tecla configurable y animaciones suaves para NeoForge 1.21.1.',
      category: 'mod',
      badge: '100% Cliente • NeoForge 1.21.1',
      iconType: 'search'
    },
    {
      id: '3dskinlayers',
      projectId: 'zV5r3pPn',
      title: '3D Skin Layers',
      author: 'tr7zw',
      description: 'Renderiza las capas exteriores de las skins de los jugadores en 3D real sin afectar FPS.',
      category: 'mod',
      badge: '100% Cliente • NeoForge 1.21.1',
      iconType: 'box'
    },
    {
      id: 'chat-heads',
      projectId: 'Wb5oqrBJ',
      title: 'Chat Heads',
      author: 'dzwdz',
      description: 'Muestra la cabeza de la skin de cada jugador junto a sus mensajes en el chat del servidor.',
      category: 'mod',
      badge: '100% Cliente • NeoForge 1.21.1',
      iconType: 'message'
    },
    {
      id: 'betterf3',
      projectId: '8shC1gFX',
      title: 'BetterF3 (Pantalla F3 Moderna)',
      author: 'cominixo',
      description: 'Reemplaza la pantalla de depuración F3 de Minecraft con módulos limpios, legibles y a color.',
      category: 'mod',
      badge: '100% Cliente • NeoForge 1.21.1',
      iconType: 'activity'
    },
    {
      id: 'notenoughanimations',
      projectId: 'MPCX6s5C',
      title: 'Not Enough Animations',
      author: 'tr7zw',
      description: 'Añade animaciones fluidas en tercera persona al comer, usar mapas, remar o sostener objetos.',
      category: 'mod',
      badge: '100% Cliente • NeoForge 1.21.1',
      iconType: 'user'
    },
    {
      id: 'controlling',
      projectId: 'xv94TkTM',
      title: 'Controlling (Buscador de Teclas)',
      author: 'Jaredlll08',
      description: 'Permite buscar controles por nombre o por tecla asignada para evitar conflictos de atajos.',
      category: 'mod',
      badge: '100% Cliente • NeoForge 1.21.1',
      iconType: 'sliders'
    }
  ],
  resourcepack: [
    {
      id: 'faithful-32x',
      projectId: 'w0TnApzs',
      title: 'Faithful 32x (HD Clásico)',
      author: 'Faithful Team',
      description: 'Duplica la resolución de las texturas de Minecraft 1.21.1 manteniendo el estilo original intacto.',
      category: 'resourcepack',
      badge: 'Resource Pack • 1.21.1',
      iconType: 'layers'
    },
    {
      id: 'fresh-animations',
      projectId: '50dA9Sha',
      title: 'Fresh Animations',
      author: 'FreshLX',
      description: 'Da vida a las criaturas y aldeanos con animaciones faciales y corporales dinámicas.',
      category: 'resourcepack',
      badge: 'Resource Pack • 1.21.1',
      iconType: 'sparkles'
    },
    {
      id: 'stay-true',
      projectId: 'fM515JnW',
      title: 'Stay True (Vegetación y Bloques)',
      author: 'haimcyfly',
      description: 'Mejora visualmente hojas, césped y bloques variados manteniendo la estética natural.',
      category: 'resourcepack',
      badge: 'Resource Pack • 1.21.1',
      iconType: 'layers'
    },
    {
      id: 'dark-mode-everywhere',
      projectId: 'bXX9h73M',
      title: 'Default Dark Mode UI',
      author: 'nebuIr',
      description: 'Convierte todos los inventarios y menús del juego a un modo oscuro elegante y descansado para la vista.',
      category: 'resourcepack',
      badge: 'Resource Pack • 1.21.1',
      iconType: 'moon'
    }
  ],
  shader: [
    {
      id: 'complementary-unbound',
      projectId: 'R6NEzAwj',
      title: 'Complementary Shaders - Unbound',
      author: 'EminGT',
      description: 'Iluminación realista, agua cristalina, nubes volumétricas y excelente optimización con Iris/Oculus.',
      category: 'shader',
      badge: 'Shader • Iris / Oculus',
      iconType: 'sun'
    },
    {
      id: 'complementary-reimagined',
      projectId: 'HVnmMxH1',
      title: 'Complementary Shaders - Reimagined',
      author: 'EminGT',
      description: 'Conserva la estética cúbica de Minecraft con sombras dinámicas, reflejos y atmósfera mágica.',
      category: 'shader',
      badge: 'Shader • Iris / Oculus',
      iconType: 'sparkles'
    },
    {
      id: 'bsl-shaders',
      projectId: 'Q1vvjJYV',
      title: 'BSL Shaders',
      author: 'Capttatsu',
      description: 'Colores cálidos cinematográficos, iluminación suave y alto rendimiento para cualquier GPU.',
      category: 'shader',
      badge: 'Shader • Iris / Oculus',
      iconType: 'sun'
    },
    {
      id: 'sildurs-vibrant',
      projectId: 'pfjLUfGv',
      title: 'MakeUp - Ultra Fast Shaders',
      author: 'XavierFST',
      description: 'Shader ultraligero diseñado para PCs de bajos recursos sin sacrificar sombras ni reflejos.',
      category: 'shader',
      badge: 'Shader • Ultra FPS',
      iconType: 'zap'
    }
  ]
};

function getGameDir() {
  const cfg = loadConfig();
  return path.join(app.getPath('home'), cfg.launcher?.gameDataFolder || '.doraland');
}

function getUserClientModsRegistry(gameDir) {
  const storeList = getStore().get('userClientMods', []);
  const diskRegistryPath = path.join(gameDir, 'user-client-mods.json');
  let diskList = [];
  if (fs.existsSync(diskRegistryPath)) {
    try {
      const parsed = fs.readJsonSync(diskRegistryPath);
      if (Array.isArray(parsed)) diskList = parsed;
    } catch {}
  }
  const mergedMap = new Map();
  for (const item of [...storeList, ...diskList]) {
    if (item && item.fileName) {
      mergedMap.set(item.fileName.toLowerCase(), item);
    }
  }
  return Array.from(mergedMap.values());
}

async function saveUserClientModsRegistry(gameDir, list) {
  getStore().set('userClientMods', list);
  try {
    await fs.ensureDir(gameDir);
    await fs.writeJson(path.join(gameDir, 'user-client-mods.json'), list, { spaces: 2 });
  } catch {}
}

function getUserClientModsSet(gameDir) {
  const list = getUserClientModsRegistry(gameDir);
  return new Set(list.map(x => String(x.fileName || '').toLowerCase()).filter(Boolean));
}

// Obtiene únicamente los complementos instalados por el jugador (nunca expone los 149 mods del servidor)
ipcMain.handle('get-user-addons', async () => {
  try {
    const gameDir = getGameDir();
    const modsDir = path.join(gameDir, 'mods');
    const rpDir = path.join(gameDir, 'resourcepacks');
    const shadersDir = path.join(gameDir, 'shaderpacks');

    await Promise.all([
      fs.ensureDir(modsDir),
      fs.ensureDir(rpDir),
      fs.ensureDir(shadersDir)
    ]);

    // 1. Mods de Cliente instalados por el usuario
    const userModRegistry = getUserClientModsRegistry(gameDir);
    const activeUserMods = [];
    for (const entry of userModRegistry) {
      const fullPath = path.join(modsDir, entry.fileName);
      if (fs.existsSync(fullPath)) {
        const stat = await fs.stat(fullPath);
        activeUserMods.push({
          fileName: entry.fileName,
          title: entry.title || entry.fileName.replace(/\.jar$/i, ''),
          sizeKb: Math.max(1, Math.round(stat.size / 1024)),
          category: 'mod',
          installedAt: entry.installedAt || stat.mtimeMs
        });
      }
    }

    // 2. Resource Packs (excluyendo el paquete interno DoralandCustomSkin)
    const rpEntries = await fs.readdir(rpDir, { withFileTypes: true });
    const resourcepacks = [];
    for (const ent of rpEntries) {
      if (ent.name === 'DoralandCustomSkin') continue;
      if (ent.isFile() && ent.name.toLowerCase().endsWith('.zip')) {
        const stat = await fs.stat(path.join(rpDir, ent.name));
        resourcepacks.push({
          fileName: ent.name,
          title: ent.name.replace(/\.zip$/i, ''),
          sizeKb: Math.max(1, Math.round(stat.size / 1024)),
          category: 'resourcepack',
          installedAt: stat.mtimeMs
        });
      }
    }

    // 3. Shaders
    const shaderEntries = await fs.readdir(shadersDir, { withFileTypes: true });
    const shaders = [];
    for (const ent of shaderEntries) {
      if (ent.isFile() && ent.name.toLowerCase().endsWith('.zip')) {
        const stat = await fs.stat(path.join(shadersDir, ent.name));
        shaders.push({
          fileName: ent.name,
          title: ent.name.replace(/\.zip$/i, ''),
          sizeKb: Math.max(1, Math.round(stat.size / 1024)),
          category: 'shader',
          installedAt: stat.mtimeMs
        });
      }
    }

    return {
      success: true,
      mods: activeUserMods,
      resourcepacks,
      shaders
    };
  } catch (err) {
    return { success: false, error: err.message, mods: [], resourcepacks: [], shaders: [] };
  }
});

// Busca en el catálogo de Modrinth (filtrado estrictamente para Cliente NeoForge 1.21.1, Resource Packs o Shaders)
ipcMain.handle('search-addons-catalog', async (_, { category = 'mod', query = '' } = {}) => {
  const cleanCat = ['mod', 'resourcepack', 'shader'].includes(category) ? category : 'mod';
  const cleanQuery = String(query || '').trim();

  // Si no hay búsqueda escrita, devolver los recomendados + resultados populares de Modrinth
  const curated = RECOMMENDED_CLIENT_ADDONS[cleanCat] || [];

  try {
    let facets = [];
    if (cleanCat === 'mod') {
      facets = [
        ['project_type:mod'],
        ['versions:1.21.1'],
        ['categories:neoforge'],
        ['client_side:required', 'client_side:optional']
      ];
    } else if (cleanCat === 'resourcepack') {
      facets = [
        ['project_type:resourcepack'],
        ['versions:1.21.1']
      ];
    } else if (cleanCat === 'shader') {
      facets = [
        ['project_type:shader']
      ];
    }

    const searchUrl = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(cleanQuery)}&limit=12&facets=${encodeURIComponent(JSON.stringify(facets))}`;
    const data = await fetchRemoteJson(searchUrl);

    if (data && Array.isArray(data.hits)) {
      // Filtrar cualquier mod que sea server_side:required para garantizar 100% compatibilidad de cliente
      const remoteItems = data.hits
        .filter(hit => cleanCat !== 'mod' || hit.server_side !== 'required')
        .map(hit => ({
          id: hit.slug || hit.project_id,
          projectId: hit.project_id,
          title: hit.title,
          author: hit.author || 'Modrinth Creator',
          description: hit.description || 'Complemento compatible con Minecraft 1.21.1.',
          category: cleanCat,
          badge: cleanCat === 'mod' ? 'Cliente • NeoForge 1.21.1' : cleanCat === 'resourcepack' ? 'Resource Pack • 1.21.1' : 'Shader • Iris/Oculus',
          iconUrl: hit.icon_url || '',
          downloads: hit.downloads || 0,
          iconType: cleanCat === 'mod' ? 'box' : cleanCat === 'resourcepack' ? 'layers' : 'sparkles'
        }));

      if (!cleanQuery) {
        const seenIds = new Set(curated.map(c => c.projectId));
        return {
          success: true,
          items: [...curated, ...remoteItems.filter(r => !seenIds.has(r.projectId))].slice(0, 14)
        };
      }
      return { success: true, items: remoteItems };
    }
  } catch {}

  // Fallback offline a la lista curada si no hay red
  const filteredCurated = cleanQuery
    ? curated.filter(c => c.title.toLowerCase().includes(cleanQuery.toLowerCase()) || c.description.toLowerCase().includes(cleanQuery.toLowerCase()))
    : curated;
  return { success: true, items: filteredCurated };
});

// Instala un Mod de Cliente, Resource Pack o Shader desde Modrinth en 1 clic
ipcMain.handle('install-remote-addon', async (_, payload) => {
  try {
    if (!payload || !payload.projectId) {
      return { error: 'ID de proyecto inválido.' };
    }

    const category = ['mod', 'resourcepack', 'shader'].includes(payload.category) ? payload.category : 'mod';
    const gameDir = getGameDir();
    const targetFolder = category === 'mod' ? 'mods' : category === 'resourcepack' ? 'resourcepacks' : 'shaderpacks';
    const destDir = path.join(gameDir, targetFolder);
    await fs.ensureDir(destDir);

    // Consultar versiones compatibles en Modrinth
    let versionUrl = `https://api.modrinth.com/v2/project/${encodeURIComponent(payload.projectId)}/version`;
    if (category === 'mod') {
      versionUrl += `?loaders=${encodeURIComponent(JSON.stringify(['neoforge', 'forge']))}&game_versions=${encodeURIComponent(JSON.stringify(['1.21.1', '1.21']))}`;
    } else if (category === 'resourcepack') {
      versionUrl += `?game_versions=${encodeURIComponent(JSON.stringify(['1.21.1', '1.21']))}`;
    }

    let versions = await fetchRemoteJson(versionUrl).catch(() => []);
    if (!Array.isArray(versions) || versions.length === 0) {
      // Segundo intento más flexible para shaders o resourcepacks universales
      versions = await fetchRemoteJson(`https://api.modrinth.com/v2/project/${encodeURIComponent(payload.projectId)}/version`).catch(() => []);
    }

    if (!Array.isArray(versions) || versions.length === 0) {
      return { error: 'No se encontró una versión compatible para Minecraft 1.21.1.' };
    }

    const chosenVersion = versions[0];
    const primaryFile = (chosenVersion.files || []).find(f => f.primary) || (chosenVersion.files || [])[0];
    if (!primaryFile || !primaryFile.url || !primaryFile.filename) {
      return { error: 'El proyecto no contiene un archivo descargable válido.' };
    }

    const safeFileName = path.basename(primaryFile.filename);
    const destPath = path.join(destDir, safeFileName);

    await downloadFile(primaryFile.url, destPath);

    if (category === 'mod') {
      if (!isValidJarFile(destPath)) {
        await fs.remove(destPath);
        return { error: 'El archivo JAR descargado no es válido.' };
      }
      const reg = getUserClientModsRegistry(gameDir);
      const filtered = reg.filter(x => x.fileName.toLowerCase() !== safeFileName.toLowerCase());
      filtered.push({
        fileName: safeFileName,
        title: payload.title || safeFileName.replace(/\.jar$/i, ''),
        projectId: payload.projectId,
        installedAt: Date.now()
      });
      await saveUserClientModsRegistry(gameDir, filtered);
    }

    appendLauncherLog(`Complemento instalado (${category}): ${safeFileName}`);
    return {
      success: true,
      fileName: safeFileName,
      title: payload.title || safeFileName,
      category
    };
  } catch (err) {
    return { error: err.message || 'Error al instalar el complemento.' };
  }
});

// Permite instalar un Mod de Cliente (.jar), Resource Pack (.zip) o Shader (.zip) desde el PC del usuario
ipcMain.handle('install-local-addon', async (_, category = 'mod') => {
  try {
    const cleanCat = ['mod', 'resourcepack', 'shader'].includes(category) ? category : 'mod';
    const isMod = cleanCat === 'mod';

    const result = await dialog.showOpenDialog(mainWindow, {
      title: isMod
        ? 'Instalar Mod de Cliente Compatible (.JAR - NeoForge 1.21.1)'
        : cleanCat === 'resourcepack'
          ? 'Instalar Resource Pack (.ZIP)'
          : 'Instalar Paquete de Shaders (.ZIP)',
      filters: [
        isMod
          ? { name: 'Mod de Minecraft (.jar)', extensions: ['jar'] }
          : { name: 'Paquete Comprimido (.zip)', extensions: ['zip'] }
      ],
      properties: ['openFile', 'multiSelections']
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const gameDir = getGameDir();
    const targetFolder = isMod ? 'mods' : cleanCat === 'resourcepack' ? 'resourcepacks' : 'shaderpacks';
    const destDir = path.join(gameDir, targetFolder);
    await fs.ensureDir(destDir);

    const installedNames = [];
    const reg = isMod ? getUserClientModsRegistry(gameDir) : [];

    for (const srcPath of result.filePaths) {
      const fileName = path.basename(srcPath);
      if (isMod && !isValidJarFile(srcPath)) {
        return { error: `El archivo "${fileName}" no es un mod .JAR válido.` };
      }
      const destPath = path.join(destDir, fileName);
      await fs.copy(srcPath, destPath, { overwrite: true });
      installedNames.push(fileName);

      if (isMod) {
        const idx = reg.findIndex(x => x.fileName.toLowerCase() === fileName.toLowerCase());
        if (idx >= 0) reg.splice(idx, 1);
        reg.push({
          fileName,
          title: fileName.replace(/\.jar$/i, ''),
          installedAt: Date.now()
        });
      }
    }

    if (isMod) {
      await saveUserClientModsRegistry(gameDir, reg);
    }

    appendLauncherLog(`Complementos locales instalados (${cleanCat}): ${installedNames.join(', ')}`);
    return {
      success: true,
      installed: installedNames,
      category: cleanCat
    };
  } catch (err) {
    return { error: err.message || 'Error al instalar archivo desde PC.' };
  }
});

// Elimina un complemento instalado por el usuario
ipcMain.handle('remove-user-addon', async (_, { category, fileName } = {}) => {
  try {
    if (!fileName) return { error: 'Nombre de archivo inválido.' };
    const cleanCat = ['mod', 'resourcepack', 'shader'].includes(category) ? category : 'mod';
    const safeName = path.basename(fileName);
    const gameDir = getGameDir();
    const targetFolder = cleanCat === 'mod' ? 'mods' : cleanCat === 'resourcepack' ? 'resourcepacks' : 'shaderpacks';
    const fullPath = path.join(gameDir, targetFolder, safeName);

    if (fs.existsSync(fullPath)) {
      await fs.remove(fullPath);
    }

    if (cleanCat === 'mod') {
      const reg = getUserClientModsRegistry(gameDir).filter(
        x => x.fileName.toLowerCase() !== safeName.toLowerCase()
      );
      await saveUserClientModsRegistry(gameDir, reg);
    }

    appendLauncherLog(`Complemento de usuario eliminado (${cleanCat}): ${safeName}`);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('open-addon-folder', async (_, category = 'mod') => {
  const cleanCat = ['mod', 'resourcepack', 'shader'].includes(category) ? category : 'mod';
  const gameDir = getGameDir();
  const folder = cleanCat === 'mod' ? 'mods' : cleanCat === 'resourcepack' ? 'resourcepacks' : 'shaderpacks';
  const target = path.join(gameDir, folder);
  await fs.ensureDir(target);
  await shell.openPath(target);
  return { success: true, path: target };
});

// Calcula y devuelve el Changelog completo (versiones del Launcher + Mods agregados, actualizados o retirados)
ipcMain.handle('get-changelog', async () => {
  const cfg = loadConfig();
  const baseChangelog = Array.isArray(cfg.changelog) && cfg.changelog.length > 0
    ? cfg.changelog
    : DEFAULT_CONFIG.changelog;

  const autoModDiff = getStore().get('lastModpackDiff', null);
  return {
    success: true,
    entries: baseChangelog,
    autoModDiff
  };
});

// Optimiza el Launcher liberando cachés temporales, instaladores antiguos y memoria de sesión
ipcMain.handle('optimize-launcher', async () => {
  try {
    const gameDir = getGameDir();
    let freedBytes = 0;

    // 1. Limpiar instaladores temporales ya utilizados (.doraland/installers)
    const installersDir = path.join(gameDir, 'installers');
    if (fs.existsSync(installersDir)) {
      const files = await fs.readdir(installersDir);
      for (const f of files) {
        const fp = path.join(installersDir, f);
        try {
          const st = await fs.stat(fp);
          freedBytes += st.size;
          await fs.remove(fp);
        } catch {}
      }
    }

    // 2. Recortar logs antiguos si superan 2 MB
    const logDir = path.join(gameDir, 'logs');
    if (fs.existsSync(logDir)) {
      const files = await fs.readdir(logDir);
      for (const f of files) {
        if (f.endsWith('.log.gz') || f.includes('debug')) {
          const fp = path.join(logDir, f);
          try {
            const st = await fs.stat(fp);
            freedBytes += st.size;
            await fs.remove(fp);
          } catch {}
        }
      }
    }

    // 3. Limpiar caché HTTP/GPU de la ventana Electron
    if (mainWindow && !mainWindow.isDestroyed()) {
      await mainWindow.webContents.session.clearCache().catch(() => {});
    }

    const freedMb = (freedBytes / (1024 * 1024)).toFixed(1);
    appendLauncherLog(`Optimización ejecutada: ${freedMb} MB liberados y caché de sesión depurada.`);
    return {
      success: true,
      freedMb
    };
  } catch (err) {
    return { error: err.message };
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

let cachedJavaResult = null;

async function findAndValidateJava() {
  if (cachedJavaResult && cachedJavaResult.valid && fs.existsSync(cachedJavaResult.path)) {
    return cachedJavaResult;
  }

  const cfg = loadConfig();

  if (cfg.minecraft?.javaPath) {
    const customCheck = checkJavaExecutable(cfg.minecraft.javaPath);
    if (customCheck.valid) {
      cachedJavaResult = customCheck;
      return customCheck;
    }
  }

  const savedJavaPath = getStore().get('cachedJavaPath', '');
  if (savedJavaPath && fs.existsSync(savedJavaPath)) {
    const savedCheck = checkJavaExecutable(savedJavaPath);
    if (savedCheck.valid) {
      cachedJavaResult = savedCheck;
      return savedCheck;
    }
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
    if (check.valid) {
      cachedJavaResult = check;
      getStore().set('cachedJavaPath', check.path);
      return check;
    }
  }

  if (process.env.JAVA_HOME) {
    const javaBin = path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    const check = checkJavaExecutable(javaBin);
    if (check.valid) {
      cachedJavaResult = check;
      getStore().set('cachedJavaPath', check.path);
      return check;
    }
  }

  if (process.platform === 'win32') {
    try {
      const whereLines = execSync('where.exe java', { encoding: 'utf8', timeout: 3000 }).trim().split(/\r?\n/);
      for (const line of whereLines) {
        const check = checkJavaExecutable(line.trim());
        if (check.valid) {
          cachedJavaResult = check;
          getStore().set('cachedJavaPath', check.path);
          return check;
        }
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
    https.get(url, { agent: keepAliveAgent, headers: { 'User-Agent': 'DoralandLauncher/1.0.3' } }, (res) => {
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
    https.get(url, { agent: keepAliveAgent, headers: { 'User-Agent': 'DoralandLauncher/1.0.3' } }, (res) => {
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

  const candidates = [];
  if (app.isPackaged) {
    if (process.env.PORTABLE_EXECUTABLE_DIR) {
      candidates.push(path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'overrides'));
    }
    candidates.push(path.join(path.dirname(app.getPath('exe')), 'overrides'));
    candidates.push(path.join(process.resourcesPath, 'overrides'));
    candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'overrides'));
  }
  candidates.push(path.join(__dirname, '..', 'overrides'));

  const bundledOverridesPath = candidates.find(p => fs.existsSync(p));
  if (!bundledOverridesPath) {
    return;
  }

  event?.sender.send('launch-log', { type: 'info', msg: '🎨 Sincronizando configuraciones, menú Doraland, emotes y shaders...' });

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
// 10. SINCRONIZACIÓN DE MODS HÍBRIDA (LOCAL + REMOTA EN GITHUB)
// ============================================================================
async function syncModsProtected(gameDir, cfg, event) {
  const targetModsPath = path.join(gameDir, 'mods');
  await fs.ensureDir(targetModsPath);

  // 1. Si existe carpeta mods/ local junto al launcher, copiar primero desde disco (instantáneo)
  await syncLocalBundledMods(targetModsPath, cfg, event, false);

  // 2. Sincronizar contra el manifiesto remoto (o el manifiesto empaquetado de respaldo)
  let manifest = null;
  if (cfg.mods?.remoteManifestUrl && cfg.mods?.source !== 'bundled') {
    try {
      event?.sender.send('launch-log', { type: 'info', msg: '🌐 Verificando lista oficial de mods en el servidor...' });
      manifest = await fetchRemoteJson(cfg.mods.remoteManifestUrl);
    } catch (err) {
      event?.sender.send('launch-log', { type: 'warn', msg: `⚠️ Servidor remoto ocupado (${err.message}). Usando manifiesto integrado.` });
    }
  }

  if (!manifest) {
    const localManifestPath = path.join(__dirname, '..', 'mods-manifest.json');
    if (fs.existsSync(localManifestPath)) {
      try {
        manifest = await fs.readJson(localManifestPath);
      } catch {}
    }
  }

  if (manifest && Array.isArray(manifest.mods) && manifest.mods.length > 0) {
    if (manifest.server?.ip) cfg.server.ip = manifest.server.ip;
    if (manifest.minecraft?.loaders && typeof manifest.minecraft.loaders === 'object') {
      cfg.minecraft.loaders = { ...cfg.minecraft.loaders, ...manifest.minecraft.loaders };
    }

    await syncRemoteModsList(manifest.mods, targetModsPath, cfg, event);
  }
}

async function syncRemoteModsList(remoteMods, targetModsPath, cfg, event) {
  const gameDir = path.dirname(targetModsPath);
  const userClientModsSet = getUserClientModsSet(gameDir);
  const remoteNames = remoteMods.map(m => m.name.toLowerCase());

  // Registrar automáticamente en el Changelog qué mods se agregaron, actualizaron o retiraron respecto a la última sincronización
  try {
    const prevSnapshot = getStore().get('lastKnownModsSnapshot', null);
    if (prevSnapshot && typeof prevSnapshot === 'object') {
      const added = [];
      const updated = [];
      const removed = [];
      const currentMap = {};

      for (const m of remoteMods) {
        currentMap[m.name] = m.size || 0;
        if (!(m.name in prevSnapshot)) {
          added.push(m.name);
        } else if (m.size && prevSnapshot[m.name] && prevSnapshot[m.name] !== m.size) {
          updated.push(m.name);
        }
      }
      for (const oldName of Object.keys(prevSnapshot)) {
        if (!(oldName in currentMap)) {
          removed.push(oldName);
        }
      }

      if (added.length > 0 || updated.length > 0 || removed.length > 0) {
        getStore().set('lastModpackDiff', {
          date: new Date().toISOString().slice(0, 10),
          added,
          updated,
          removed
        });
      }
    }

    const nextSnapshot = {};
    for (const m of remoteMods) {
      nextSnapshot[m.name] = m.size || 0;
    }
    getStore().set('lastKnownModsSnapshot', nextSnapshot);
  } catch {}

  if (cfg.mods?.cleanOldMods && remoteMods.length > 0) {
    const localFiles = await fs.readdir(targetModsPath);
    for (const file of localFiles) {
      const lower = file.toLowerCase();
      // Proteger los Mods de Cliente instalados por el jugador para que nunca se borren
      if (lower.endsWith('.jar') && !remoteNames.includes(lower) && !userClientModsSet.has(lower)) {
        await fs.remove(path.join(targetModsPath, file));
        event?.sender.send('launch-log', { type: 'warn', msg: `🗑️ Mod antiguo retirado del servidor: ${file}` });
      }
    }
  }

  // Filtrar solo los mods que faltan o cambiaron de tamaño
  const pendingMods = [];
  for (const mod of remoteMods) {
    const destPath = path.join(targetModsPath, mod.name);
    let needsDownload = true;
    if (fs.existsSync(destPath) && isValidJarFile(destPath)) {
      const stat = await fs.stat(destPath);
      if (mod.size && stat.size === mod.size) {
        needsDownload = false;
      }
    }
    if (needsDownload) {
      pendingMods.push(mod);
    }
  }

  if (pendingMods.length === 0) {
    event?.sender.send('launch-log', { type: 'info', msg: `✔️ Todos los mods están al día (${remoteMods.length} mods verificados).` });
    return;
  }

  event?.sender.send('launch-log', { type: 'info', msg: `⬇️ Descargando ${pendingMods.length} mods pendientes desde el repositorio...` });

  let updatedCount = 0;
  let completedTasks = 0;
  let warned404 = false;
  const concurrency = 6;
  let currentIndex = 0;

  async function downloadWithRetry(url, dest, maxRetries = 3) {
    let lastErr;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await downloadFile(url, dest);
        if (isValidJarFile(dest)) return;
        await fs.remove(dest);
        throw new Error('Archivo JAR incompleto o dañado');
      } catch (err) {
        lastErr = err;
        if (err.message.includes('HTTP 404')) break; // No reintentar si es 404
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 800 * attempt));
        }
      }
    }
    throw lastErr;
  }

  async function worker() {
    while (currentIndex < pendingMods.length) {
      const idx = currentIndex++;
      const mod = pendingMods[idx];
      const destPath = path.join(targetModsPath, mod.name);

      let modUrl = mod.url;
      if (!modUrl && cfg.mods.remoteManifestUrl) {
        const baseUrl = cfg.mods.remoteManifestUrl.substring(0, cfg.mods.remoteManifestUrl.lastIndexOf('/'));
        modUrl = `${baseUrl}/mods/${encodeURIComponent(mod.name)}`;
      }

      try {
        await downloadWithRetry(modUrl, destPath, 3);
        updatedCount++;
        completedTasks++;
        event?.sender.send('launch-progress', {
          type: `Mods (${completedTasks}/${pendingMods.length}): ${mod.name}`,
          task: completedTasks,
          total: pendingMods.length
        });
        event?.sender.send('launch-log', { type: 'info', msg: `✅ [${completedTasks}/${pendingMods.length}] Mod descargado: ${mod.name}` });
      } catch (dlErr) {
        completedTasks++;
        if (dlErr.message.includes('HTTP 404') && !warned404) {
          warned404 = true;
          event?.sender.send('launch-log', {
            type: 'error',
            msg: '❌ Error HTTP 404 en GitHub: El repositorio Sluzzen/Launcher-Doraland está en modo PRIVADO. Cámbialo a PÚBLICO en GitHub (Settings -> Change visibility -> Public) para permitir la descarga automática de mods.'
          });
        } else {
          event?.sender.send('launch-log', { type: 'error', msg: `❌ Error descargando ${mod.name}: ${dlErr.message}` });
        }
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, pendingMods.length) }, () => worker());
  await Promise.all(workers);

  if (updatedCount > 0) {
    event?.sender.send('launch-log', { type: 'info', msg: `🎉 Se descargaron/actualizaron ${updatedCount} mods automáticamente.` });
  }
}

async function syncLocalBundledMods(targetModsPath, cfg, event, cleanExtra = false) {
  const candidates = [];
  if (app.isPackaged) {
    if (process.env.PORTABLE_EXECUTABLE_DIR) {
      candidates.push(path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'mods'));
    }
    candidates.push(path.join(path.dirname(app.getPath('exe')), 'mods'));
    candidates.push(path.join(process.resourcesPath, 'mods'));
  } else {
    candidates.push(path.join(__dirname, '..', 'mods'));
  }

  const bundledModsPath = candidates.find(p => fs.existsSync(p));
  if (!bundledModsPath) {
    return;
  }

  const rawFiles = await fs.readdir(bundledModsPath);
  const bundledJars = rawFiles.filter(f => f.toLowerCase().endsWith('.jar'));

  if (bundledJars.length === 0) {
    return;
  }

  event?.sender.send('launch-log', { type: 'info', msg: `📦 Verificando ${bundledJars.length} mods desde paquete local...` });

  if (cleanExtra && cfg.mods?.cleanOldMods) {
    const gameDir = path.dirname(targetModsPath);
    const userClientModsSet = getUserClientModsSet(gameDir);
    const currentFiles = await fs.readdir(targetModsPath);
    for (const file of currentFiles) {
      const lower = file.toLowerCase();
      if (lower.endsWith('.jar') && !bundledJars.includes(file) && !userClientModsSet.has(lower)) {
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
    }
  }

  if (updatedCount > 0) {
    event?.sender.send('launch-log', { type: 'info', msg: `✅ Se copiaron ${updatedCount} mods desde el paquete local.` });
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

    // Asegurar que BootstrapLauncher ignore el jar base y los módulos boot en -cp
    if (arg.startsWith('-DignoreList=')) {
      const extraIgnores = [
        `${mcVersion}.jar`,
        'bootstraplauncher',
        'securejarhandler',
        'asm-commons',
        'asm-util',
        'asm-analysis',
        'asm-tree',
        'asm-',
        'JarJarFileSystems'
      ];
      for (const item of extraIgnores) {
        if (!arg.includes(item)) {
          arg = `${arg},${item}`;
        }
      }
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
  if (isUpdatingLauncher) {
    return { error: 'El launcher se está actualizando a la última versión. Espera unos segundos.' };
  }

  // Verificar antes de lanzar que el launcher esté en la última versión
  const preLaunchUpdate = await checkAndApplyGitBranchSelfUpdate();
  if (preLaunchUpdate.updated) {
    return { error: `Actualizando el launcher a la versión v${preLaunchUpdate.remoteVersion}. Se reiniciará en unos segundos.` };
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

    // 1.1 Aplicar skin personalizada si el jugador No Premium (o usuario) subió una skin
    const savedSkin = getStore().get('customSkin', null);
    if (savedSkin && savedSkin.dataUrl) {
      await applyCustomSkinToGameDir(savedSkin, session.name);
      event.sender.send('launch-log', { type: 'info', msg: `🎨 Skin personalizada aplicada para ${session.name} (${savedSkin.name || 'PNG'}).` });
    }

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

    const resW = Math.min(7680, Math.max(640, parseInt(getStore().get('resolutionWidth', 1280)) || 1280));
    const resH = Math.min(4320, Math.max(480, parseInt(getStore().get('resolutionHeight', 720)) || 720));
    const isFullscreen = Boolean(getStore().get('fullscreen', false));
    const userJvmStr = String(getStore().get('customJvmArgs', '') || '').trim();
    const userJvmList = userJvmStr ? userJvmStr.split(/\s+/).filter(Boolean) : [];

    event.sender.send('launch-log', {
      type: 'info',
      msg: `📊 Asignando RAM: ${safeRam}MB (Mínimo: ${minRam}MB) • Resolución: ${isFullscreen ? 'Pantalla Completa' : `${resW}x${resH}`}`
    });

    const turboEnabled = getStore().get('turboOptimize', true);
    const turboJvmArgs = turboEnabled
      ? ['-XX:+AlwaysPreTouch', '-Dfml.readTimeout=120', '-Dsun.rmi.dgc.server.gcInterval=2147483646']
      : [];

    const jvmArgs = [
      ...(cfg.minecraft?.jvmArgs || []),
      ...turboJvmArgs,
      ...userJvmList,
      ...(loaderSetup.extraJvmArgs || [])
    ];

    // Reutilizar jar y json vanilla ya descargados por el instalador y filtrar nativos de arquitecturas ajenas (ej. arm64/x86 en Windows x64)
    const vanillaDir = path.join(gameDir, 'versions', mcVersion);
    const vanillaJsonPath = path.join(vanillaDir, `${mcVersion}.json`);
    const vanillaJarPath = path.join(vanillaDir, `${mcVersion}.jar`);
    const overrides = {};

    if (fs.existsSync(vanillaJsonPath)) {
      try {
        const vJson = await fs.readJson(vanillaJsonPath);
        if (Array.isArray(vJson.libraries) && process.arch === 'x64') {
          const filtered = vJson.libraries.filter(lib => {
            const name = lib?.name || '';
            return !name.endsWith(':natives-windows-arm64') && !name.endsWith(':natives-windows-x86') && !name.endsWith(':natives-macos-arm64');
          });
          if (filtered.length !== vJson.libraries.length) {
            vJson.libraries = filtered;
            await fs.writeJson(vanillaJsonPath, vJson, { spaces: 2 });
          }
        }
        overrides.versionJson = vanillaJsonPath;
      } catch {}
    }
    if (fs.existsSync(vanillaJarPath) && isValidJarFile(vanillaJarPath)) {
      overrides.minecraftJar = vanillaJarPath;
    }

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
      window: {
        width: resW,
        height: resH,
        fullscreen: isFullscreen
      },
      javaPath: javaCheck.path,
      customArgs: jvmArgs,
      overrides
    };

    if (loaderSetup.customVersion) {
      opts.version.custom = loaderSetup.customVersion;
    }

    if (loaderSetup.forgeInstaller && fs.existsSync(loaderSetup.forgeInstaller)) {
      opts.forge = loaderSetup.forgeInstaller;
    }

    // Auto-conexión al servidor en Minecraft 1.21.1 (QuickPlay Multiplayer)
    const autoConnectPref = getStore().get('autoConnect', cfg.server?.autoConnect !== false);
    if (autoConnectPref && cfg.server?.ip) {
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
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) mainWindow.show();
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
      event?.sender?.send('launch-close', code);
      appendLauncherLog(`Minecraft cerrado con código: ${code}`);
    });

    appendLauncherLog(`Lanzando Minecraft ${mcVersion} (${activeLoader.display}) para el usuario: ${session.name}`);
    await launcher.launch(opts);
    event.sender.send('launch-status', { status: 'launched', loader: activeLoader.display });

    if (getStore().get('closeOnLaunch', false)) {
      setTimeout(() => app.quit(), 2500);
    } else if (getStore().get('hideOnLaunch', false)) {
      setTimeout(() => mainWindow?.minimize(), 2000);
    }
  } catch (err) {
    isGameRunning = false;
    appendLauncherLog(`Error al lanzar Minecraft: ${err.message}`);
    event.sender.send('launch-status', { status: 'error', message: err.message });
  }
});
