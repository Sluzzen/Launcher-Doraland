/* ============================================================
   APP.JS — Lógica del Renderer (WEB SMP LAUNCHER v1.0.0)
   Desarrollado por SLuzzen
   Incluye:
   - Navegación Moderna + Pantalla de Ajustes (Resolución, Cuenta Premium, RAM/JVM)
   - Estudio de Skins + Selector de Capas (Beneficio exclusivo Premium)
   - Iconografía SVG 100% libre de emojis
   - Monetización con Google Ads (AdSense + Servidor de Anuncios + Fallback Patrocinado)
   - Auto-actualizador Dual en Primer Plano y Lanzador Fabric 0.20.1 • MC 1.21.11
   ============================================================ */

// Marca de agua interna de autoría (Desarrollado por SLuzzen)
const __SLUZZEN_WM__ = Object.freeze({
  label: String.fromCharCode(68, 101, 115, 97, 114, 114, 111, 108, 108, 97, 100, 111, 32, 112, 111, 114, 32, 83, 76, 117, 122, 122, 101, 110),
  token: 'RGVzYXJyb2xsYWRvIHBvciBTTHV6emVu'
});
try {
  Object.defineProperty(window, '__doralandWatermark', {
    value: __SLUZZEN_WM__,
    writable: false,
    enumerable: false,
    configurable: false
  });
  Symbol.for('doraland.author.sluzzen');
} catch {}

// ── ESTADO GLOBAL ─────────────────────────────────────────────
let currentSession = null;
let config = null;
let currentSettings = {
  ram: 6144,
  resolutionWidth: 1280,
  resolutionHeight: 720,
  fullscreen: false,
  closeOnLaunch: false,
  hideOnLaunch: false,
  autoConnect: true,
  turboOptimize: true,
  lowSpecUi: false,
  discordRpc: true,
  customJvmArgs: ''
};
let currentSkin = null; // { dataUrl, model: 'classic'|'slim', name }
let loadedSkinImage = null;
let currentCape = { id: 'none', name: 'Sin Capa', dataUrl: null };
let loadedCapeImage = null;
let isLaunching = false;
let consoleOpen = false;
let currentAddonCategory = 'resourcepack'; // 'resourcepack' | 'shader'
let userAddonsCache = { mods: [], resourcepacks: [], shaders: [] };
let currentChangelogFilter = 'all';
let cachedChangelogData = null;

// ── SISTEMA DE ICONOS SVG VECTORIALES ─────────────────────────
function getSvgIcon(name, size = 14) {
  const s = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-icon"`;
  const icons = {
    check: `<svg ${s}><polyline points="20 6 9 17 4 12"/></svg>`,
    alert: `<svg ${s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    info: `<svg ${s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    star: `<svg ${s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    user: `<svg ${s}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    zap: `<svg ${s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    search: `<svg ${s}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    save: `<svg ${s}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    refresh: `<svg ${s}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
    folder: `<svg ${s}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    box: `<svg ${s}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    trash: `<svg ${s}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
    download: `<svg ${s}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    plus: `<svg ${s}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    minus: `<svg ${s}><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    calendar: `<svg ${s}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    rocket: `<svg ${s}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>`,
    message: `<svg ${s}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    globe: `<svg ${s}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    play: `<svg ${s}><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    activity: `<svg ${s}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    sliders: `<svg ${s}><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>`,
    layers: `<svg ${s}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    sparkles: `<svg ${s}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
    moon: `<svg ${s}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    sun: `<svg ${s}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/></svg>`,
    shield: `<svg ${s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    wrench: `<svg ${s}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`
  };
  return icons[name] || icons.box;
}

// ── INICIALIZACIÓN ────────────────────────────────────────────
async function init() {
  initAmbientFireflies();

  config = await window.doraland.getConfig();
  currentSession = await window.doraland.getSession();
  const savedSettings = await window.doraland.getSettings();
  currentSettings = { ...currentSettings, ...(savedSettings || {}) };
  currentSkin = await window.doraland.getSkin();
  const savedCape = await window.doraland.getCape();
  if (savedCape) currentCape = savedCape;

  applyConfig(config);
  applySettingsToUI(currentSettings);
  setupTitlebarAndNavigation();
  setupAuthTabs();
  setupRamAndSettingsControls();
  setupSkinStudio();
  setupCapeSelector();
  setupAddonsCenter();
  setupChangelog();
  setupGoogleAds(config?.ads);
  setupConsole();
  setupLaunchEvents();
  setupLauncherAutoUpdater();

  await refreshSkinRenderer();

  const avatarImg = document.getElementById('userAvatar');
  const avatarCanvas = document.getElementById('sidebarAvatarCanvas');
  if (avatarCanvas) {
    avatarCanvas.style.display = 'block';
    drawMinecraftHeadAvatar(avatarCanvas, null, true);
  }
  if (avatarImg) {
    avatarImg.addEventListener('error', () => {
      avatarImg.src = "../../assets/default-avatar.png";
    });
  }

  if (currentSession) {
    showScreen('screenHome');
  } else {
    showScreen('screenLogin');
  }
}

// ── FONDO AMBIENTAL DE LUCIÉRNAGAS ────────────────────────────
function initAmbientFireflies() {
  const canvas = document.getElementById('ambientCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 34 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: 1.2 + Math.random() * 2.2,
    vx: (Math.random() - 0.5) * 0.35,
    vy: -0.15 - Math.random() * 0.4,
    alpha: 0.2 + Math.random() * 0.6,
    gold: Math.random() > 0.45
  }));

  function animate() {
    // Optimización: pausar renderizado de fondo cuando la ventana está oculta, jugando o en Modo Ligero
    if (document.hidden || isLaunching || currentSettings.lowSpecUi) {
      if (currentSettings.lowSpecUi) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setTimeout(() => requestAnimationFrame(animate), 650);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;

      ctx.beginPath();
      const color = p.gold ? `rgba(220, 38, 38, ${p.alpha})` : `rgba(239, 68, 68, ${p.alpha})`;
      ctx.fillStyle = color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

// ── APLICAR CONFIGURACIÓN ──────────────────────────────────────
function applyConfig(cfg) {
  if (!cfg) return;

  const ip = cfg.server?.ip || 'enx-soc-12.enx.host:10037';

  safeText('serverIp', ip);
  safeText('playHint', __SLUZZEN_WM__.label);

  buildSocialLinks(cfg.ui);
  checkServerStatus(ip, cfg.server?.port);
}

// ── NAVEGACIÓN Y BARRA DE TÍTULO (1 BOTÓN POR FUNCIÓN) ─────────
function setupTitlebarAndNavigation() {
  document.getElementById('btnMinimize')?.addEventListener('click', () => window.doraland.minimize());
  document.getElementById('btnMaximize')?.addEventListener('click', () => window.doraland.maximize());
  document.getElementById('btnClose')?.addEventListener('click', () => window.doraland.close());

  // Único botón para copiar IP del servidor (en la tarjeta del sidebar)
  document.getElementById('btnCopyIpSidebar')?.addEventListener('click', () => {
    const ip = config?.server?.ip || 'enx-soc-12.enx.host:10037';
    navigator.clipboard?.writeText(ip);
    showNotification(`IP copiada: ${ip}`, 'success');
  });

  document.getElementById('btnRefreshServer')?.addEventListener('click', () => {
    checkServerStatus(config?.server?.ip, config?.server?.port);
  });

  // Único menú de navegación en el sidebar (Inicio / Mi Skin / Ajustes)
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      if (!currentSession && target === 'screenHome') {
        showScreen('screenLogin');
        return;
      }
      showScreen(target);
    });
  });
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId)?.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.screen === screenId);
  });

  updateUserCard(currentSession);
  updateSettingsAccountBox(currentSession);
  updateCapeUIForSession(currentSession);

  if (screenId === 'screenHome') {
    safeText('wbUsername', currentSession?.name || 'Jugador');
    setupPlayButton();
  } else if (screenId === 'screenSkin') {
    if (currentSession?.meta?.type === 'msa' && !lastCapeSyncOk) {
      updateCapeUIForSession(currentSession, true);
    }
    renderAllSkinCanvases();
  } else if (screenId === 'screenAddons') {
    refreshUserAddonsAndCatalog();
  } else if (screenId === 'screenChangelog') {
    loadAndRenderChangelog();
  }
}

// ── TABS DE AUTENTICACIÓN (LOGIN) ──────────────────────────────
function setupAuthTabs() {
  const tabs = document.querySelectorAll('.auth-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panelId = `panel${capitalize(tab.dataset.tab)}`;
      document.getElementById(panelId)?.classList.add('active');
    });
  });

  document.getElementById('btnMicrosoft')?.addEventListener('click', loginMicrosoft);
  document.getElementById('btnOfflineLogin')?.addEventListener('click', loginOffline);

  document.getElementById('inputNickname')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginOffline();
  });

  document.getElementById('inputNickname')?.addEventListener('input', (e) => {
    validateNickname(e.target.value, false);
  });

  document.getElementById('btnLogout')?.addEventListener('click', logout);
}

// ── LOGIN MICROSOFT (PREMIUM) ──────────────────────────────────
async function loginMicrosoft() {
  const btn = document.getElementById('btnMicrosoft');
  const settingsBtn = document.getElementById('btnSettingsPremiumLogin');
  const loading = document.getElementById('premiumLoading');
  const loadingText = document.getElementById('premiumLoadingText');

  if (btn) btn.disabled = true;
  if (settingsBtn) settingsBtn.disabled = true;
  loading?.classList.add('show');
  if (loadingText) loadingText.textContent = 'Abriendo ventana oficial de Microsoft...';

  try {
    window.doraland.onAuthUpdate((update) => {
      if (update?.title && loadingText) loadingText.textContent = update.title;
    });

    const result = await window.doraland.authMicrosoft();

    if (result && result.error) {
      showNotification(result.error, 'error');
      return;
    }

    if (result && result.session) {
      currentSession = result.session;
      lastLoadedCapeUuid = null;
      lastCapeSyncOk = false;
      await updateCapeUIForSession(currentSession, true);
      await refreshSkinRenderer();
      showScreen('screenHome');
      showNotification(`¡Conectado como ${currentSession.name} (Premium Microsoft)!`, 'success');
    }
  } catch (err) {
    showNotification('Error: ' + (err.message || 'Error de conexión con Microsoft'), 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (settingsBtn) settingsBtn.disabled = false;
    loading?.classList.remove('show');
    window.doraland.removeAllListeners('auth-update');
  }
}

// ── LOGIN OFFLINE (NO PREMIUM) ─────────────────────────────────
async function loginOffline() {
  const input = document.getElementById('inputNickname');
  const username = input?.value?.trim() || '';

  if (!validateNickname(username, true)) return;

  const btn = document.getElementById('btnOfflineLogin');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Conectando...';
  }

  try {
    const result = await window.doraland.authOffline(username);

    if (result && result.error) {
      safeText('nicknameError', result.error);
      return;
    }

    if (result && result.session) {
      currentSession = result.session;
      await refreshSkinRenderer();
      showScreen('screenHome');
      showNotification(`¡Bienvenido a Web SMP, ${username}!`, 'success');
    } else {
      safeText('nicknameError', 'No se pudo iniciar la sesión offline.');
    }
  } catch (err) {
    safeText('nicknameError', 'Error: ' + (err.message || 'Error de conexión'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Entrar como No Premium →';
    }
  }
}

function validateNickname(value, showErrors) {
  const errorEl = document.getElementById('nicknameError');
  if (!errorEl) return false;

  if (!value || value.length < 3) {
    if (showErrors) errorEl.textContent = 'Mínimo 3 caracteres.';
    return false;
  }
  if (value.length > 16) {
    if (showErrors) errorEl.textContent = 'Máximo 16 caracteres.';
    return false;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    if (showErrors) errorEl.textContent = 'Solo letras, números y guión bajo (_).';
    return false;
  }
  errorEl.textContent = '';
  return true;
}

async function logout() {
  await window.doraland.clearSession();
  currentSession = null;
  lastLoadedCapeUuid = null;
  lastCapeSyncOk = false;
  showScreen('screenLogin');
}

// ── TARJETA DE USUARIO Y ESTADO DE CUENTA EN AJUSTES ──────────
function updateUserCard(session) {
  const nameEl = document.getElementById('userName');
  const typeEl = document.getElementById('userType');
  const logoutBtn = document.getElementById('btnLogout');

  const avatarCanvas = document.getElementById('sidebarAvatarCanvas');
  const avatarImg = document.getElementById('userAvatar');

  if (!session) {
    if (nameEl) nameEl.textContent = 'Sin sesión';
    if (typeEl) {
      typeEl.textContent = 'Inicia sesión';
      typeEl.style.color = 'var(--text-muted)';
    }
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (avatarCanvas) {
      avatarCanvas.style.display = 'block';
      drawMinecraftHeadAvatar(avatarCanvas, null, true);
    }
    if (avatarImg) {
      avatarImg.style.display = 'none';
    }
    return;
  }

  if (nameEl) nameEl.textContent = session.name || 'Jugador';
  if (logoutBtn) logoutBtn.style.display = 'flex';

  const isPremium = session.meta?.type === 'msa';
  if (typeEl) {
    typeEl.innerHTML = isPremium
      ? `${getSvgIcon('star', 11)} Cuenta Premium`
      : `${getSvgIcon('user', 11)} No Premium`;
    typeEl.style.color = isPremium ? '#EF4444' : '#EF4444';
  }
}

function updateSettingsAccountBox(session) {
  const nameEl = document.getElementById('settingsAccountName');
  const typeEl = document.getElementById('settingsAccountType');
  const premBtn = document.getElementById('btnSettingsPremiumLogin');

  if (!session) {
    if (nameEl) nameEl.textContent = 'Sin sesión iniciada';
    if (typeEl) typeEl.textContent = 'Inicia sesión como Premium o No Premium';
    if (premBtn) premBtn.querySelector('span').textContent = 'Iniciar sesión con Microsoft (Premium)';
    return;
  }

  const isPremium = session.meta?.type === 'msa';
  if (nameEl) nameEl.textContent = session.name;
  if (typeEl) {
    typeEl.innerHTML = isPremium
      ? `${getSvgIcon('star', 12)} Cuenta Oficial Microsoft Premium • UUID: ${session.uuid?.slice(0, 12)}...`
      : `${getSvgIcon('user', 12)} Cuenta No Premium (Offline) • Puedes subir tu Skin .PNG o cambiar a Premium`;
  }
  if (premBtn) {
    premBtn.querySelector('span').textContent = isPremium
      ? 'Cambiar de Cuenta Microsoft Premium'
      : 'Cambiar a Cuenta Premium (Microsoft)';
  }
}

// ── AJUSTES: RESOLUCIÓN, RAM, LAUNCHER SETTINGS ───────────────
function applySettingsToUI(s) {
  const ram = s.ram || 6144;
  const resW = s.resolutionWidth || 1280;
  const resH = s.resolutionHeight || 720;
  const full = Boolean(s.fullscreen);

  // Slider de RAM
  const setSlider = document.getElementById('settingsRamSlider');
  if (setSlider) {
    setSlider.value = ram;
    updateSliderFill(setSlider);
  }
  updateRamDisplay(ram);

  // Resolución
  const inputW = document.getElementById('inputResWidth');
  const inputH = document.getElementById('inputResHeight');
  const presetSel = document.getElementById('selectResPreset');
  if (inputW) inputW.value = resW;
  if (inputH) inputH.value = resH;

  if (presetSel) {
    const key = `${resW}x${resH}`;
    const hasOption = Array.from(presetSel.options).some(o => o.value === key);
    presetSel.value = hasOption ? key : 'custom';
  }

  // Toggles
  const closeSet = document.getElementById('settingsCloseOnLaunch');
  const fullSet = document.getElementById('settingsFullscreen');
  const hideSet = document.getElementById('settingsHideOnLaunch');
  const autoConnSet = document.getElementById('settingsAutoConnect');
  const turboSet = document.getElementById('settingsTurboOptimize');
  const lowSpecSet = document.getElementById('settingsLowSpecUi');
  const discordRpcSet = document.getElementById('settingsDiscordRpc');
  const jvmInput = document.getElementById('inputCustomJvm');

  if (closeSet) closeSet.checked = Boolean(s.closeOnLaunch);
  if (fullSet) fullSet.checked = full;
  if (hideSet) hideSet.checked = Boolean(s.hideOnLaunch);
  if (autoConnSet) autoConnSet.checked = s.autoConnect !== false;
  if (turboSet) turboSet.checked = s.turboOptimize !== false;
  if (lowSpecSet) lowSpecSet.checked = Boolean(s.lowSpecUi);
  if (discordRpcSet) discordRpcSet.checked = s.discordRpc !== false;
  if (jvmInput) jvmInput.value = s.customJvmArgs || '';
}

async function persistSettings(partial = {}) {
  currentSettings = { ...currentSettings, ...partial };
  applySettingsToUI(currentSettings);
  await window.doraland.saveSettings(currentSettings);
}

let maxMonitorRes = { width: 1920, height: 1080 };

const STANDARD_RESOLUTIONS = [
  { w: 854,  h: 480,  tag: 'Estándar Minecraft' },
  { w: 1280, h: 720,  tag: 'HD 720p - Recomendado' },
  { w: 1366, h: 768,  tag: 'Laptop WXGA' },
  { w: 1440, h: 900,  tag: 'WXGA+' },
  { w: 1600, h: 900,  tag: 'HD+ 900p' },
  { w: 1920, h: 1080, tag: 'Full HD 1080p' },
  { w: 1920, h: 1200, tag: 'WUXGA' },
  { w: 2560, h: 1080, tag: 'UltraWide Full HD' },
  { w: 2560, h: 1440, tag: '2K QHD' },
  { w: 2560, h: 1600, tag: 'WQXGA' },
  { w: 3440, h: 1440, tag: 'UltraWide QHD' },
  { w: 3840, h: 2160, tag: '4K UHD' }
];

function populateResolutionOptions(maxW, maxH) {
  maxMonitorRes = {
    width: Math.max(640, parseInt(maxW) || 1920),
    height: Math.max(480, parseInt(maxH) || 1080)
  };

  safeText('maxMonitorResLabel', `Máx. monitor: ${maxMonitorRes.width} × ${maxMonitorRes.height}`);

  const inputW = document.getElementById('inputResWidth');
  const inputH = document.getElementById('inputResHeight');
  if (inputW) inputW.max = String(maxMonitorRes.width);
  if (inputH) inputH.max = String(maxMonitorRes.height);

  const presetSel = document.getElementById('selectResPreset');
  if (!presetSel) return;

  const allowed = STANDARD_RESOLUTIONS.filter(
    r => r.w <= maxMonitorRes.width && r.h <= maxMonitorRes.height
  );

  // Añadir la resolución nativa exacta del monitor si no coincide con las estándar
  const hasExactNative = allowed.some(r => r.w === maxMonitorRes.width && r.h === maxMonitorRes.height);
  if (!hasExactNative) {
    allowed.push({
      w: maxMonitorRes.width,
      h: maxMonitorRes.height,
      tag: 'Nativa del Monitor'
    });
    allowed.sort((a, b) => (a.w * a.h) - (b.w * b.h));
  }

  presetSel.innerHTML = '';
  for (const r of allowed) {
    const opt = document.createElement('option');
    opt.value = `${r.w}x${r.h}`;
    const isMax = r.w === maxMonitorRes.width && r.h === maxMonitorRes.height;
    opt.textContent = isMax && !r.tag.includes('Monitor')
      ? `${r.w} × ${r.h} (${r.tag} • Máxima)`
      : `${r.w} × ${r.h} (${r.tag})`;
    presetSel.appendChild(opt);
  }

  const customOpt = document.createElement('option');
  customOpt.value = 'custom';
  customOpt.textContent = 'Personalizada (Manual)';
  presetSel.appendChild(customOpt);
}

async function setupRamAndSettingsControls() {
  const setSlider = document.getElementById('settingsRamSlider');

  let safeMax = config?.minecraft?.maxRamMb || 16384;
  let detectedW = Math.round((window.screen?.width || 1920) * (window.devicePixelRatio || 1));
  let detectedH = Math.round((window.screen?.height || 1080) * (window.devicePixelRatio || 1));

  try {
    const sys = await window.doraland.getSystemInfo();
    if (sys && sys.safeMaxRamMb) {
      safeMax = Math.min(safeMax, sys.safeMaxRamMb);
    }
    if (sys?.maxResolution?.width && sys?.maxResolution?.height) {
      detectedW = sys.maxResolution.width;
      detectedH = sys.maxResolution.height;
    }
  } catch {}

  populateResolutionOptions(detectedW, detectedH);
  currentSettings.resolutionWidth = Math.min(maxMonitorRes.width, Math.max(640, currentSettings.resolutionWidth || 1280));
  currentSettings.resolutionHeight = Math.min(maxMonitorRes.height, Math.max(480, currentSettings.resolutionHeight || 720));
  applySettingsToUI(currentSettings);

  const min = config?.minecraft?.minRamMb || 2048;
  if (setSlider) {
    setSlider.min = min;
    setSlider.max = safeMax;
    setSlider.value = Math.min(safeMax, Math.max(min, currentSettings.ram || 6144));
    updateSliderFill(setSlider);
  }
  safeText('ramMaxLabel', `${Math.round(safeMax / 1024)} GB`);
  updateRamDisplay(currentSettings.ram || 6144);

  setSlider?.addEventListener('input', () => {
    const val = parseInt(setSlider.value);
    updateRamDisplay(val);
    updateSliderFill(setSlider);
  });
  setSlider?.addEventListener('change', () => {
    persistSettings({ ram: parseInt(setSlider.value) });
  });

  // Preajustes de resolución
  const presetSel = document.getElementById('selectResPreset');
  const inputW = document.getElementById('inputResWidth');
  const inputH = document.getElementById('inputResHeight');

  presetSel?.addEventListener('change', () => {
    if (presetSel.value === 'custom') return;
    const [w, h] = presetSel.value.split('x').map(Number);
    if (w && h) {
      persistSettings({ resolutionWidth: w, resolutionHeight: h });
    }
  });

  const onManualResChange = () => {
    const w = Math.min(maxMonitorRes.width, Math.max(640, parseInt(inputW?.value) || 1280));
    const h = Math.min(maxMonitorRes.height, Math.max(480, parseInt(inputH?.value) || 720));
    persistSettings({ resolutionWidth: w, resolutionHeight: h });
  };
  inputW?.addEventListener('change', onManualResChange);
  inputH?.addEventListener('change', onManualResChange);

  // Toggles de Ajustes
  document.getElementById('settingsCloseOnLaunch')?.addEventListener('change', (e) => {
    persistSettings({ closeOnLaunch: e.target.checked });
  });
  document.getElementById('settingsFullscreen')?.addEventListener('change', (e) => {
    persistSettings({ fullscreen: e.target.checked });
  });
  document.getElementById('settingsHideOnLaunch')?.addEventListener('change', (e) => {
    persistSettings({ hideOnLaunch: e.target.checked });
  });
  document.getElementById('settingsAutoConnect')?.addEventListener('change', (e) => {
    persistSettings({ autoConnect: e.target.checked });
  });
  document.getElementById('settingsTurboOptimize')?.addEventListener('change', (e) => {
    persistSettings({ turboOptimize: e.target.checked });
  });
  document.getElementById('settingsLowSpecUi')?.addEventListener('change', (e) => {
    persistSettings({ lowSpecUi: e.target.checked });
  });
  document.getElementById('settingsDiscordRpc')?.addEventListener('change', (e) => {
    persistSettings({ discordRpc: e.target.checked });
  });
  document.getElementById('inputCustomJvm')?.addEventListener('change', (e) => {
    persistSettings({ customJvmArgs: e.target.value.trim() });
  });

  // Reparar instalación en 1 clic (sin borrar controles, mundos, capturas ni packs personales)
  document.getElementById('btnSettingsRepairInstall')?.addEventListener('click', () => {
    runRepairInstallation();
  });

  // Optimizar y liberar caché del launcher
  document.getElementById('btnSettingsOptimizeLauncher')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnSettingsOptimizeLauncher');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${getSvgIcon('zap', 14)} Optimizando...`;
    }
    try {
      const res = await window.doraland.optimizeLauncher();
      if (res?.success) {
        showNotification(`¡Launcher optimizado! Se liberaron ${res.freedMb} MB de caché y archivos temporales.`, 'success');
      } else {
        showNotification(res?.error || 'Error al optimizar', 'error');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `${getSvgIcon('zap', 14)} Optimizar y Liberar Caché del Launcher`;
      }
    }
  });

  // Botones de cuenta y mantenimiento en Ajustes
  document.getElementById('btnSettingsPremiumLogin')?.addEventListener('click', () => {
    loginMicrosoft();
  });

  document.getElementById('btnSettingsOpenFolder')?.addEventListener('click', () => {
    window.doraland.openGameFolder();
  });

  document.getElementById('btnSettingsCheckUpdate')?.addEventListener('click', async () => {
    showNotification('Verificando actualizaciones...', 'info');
    const res = await window.doraland.checkLauncherUpdate();
    if (res && !res.updateAvailable) {
      showNotification('Estás en la última versión del Launcher.', 'success');
    }
  });
}

function updateRamDisplay(mb) {
  const gb = (mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1);
  safeText('settingsRamValue', `${gb} GB`);
}

function updateSliderFill(slider) {
  if (!slider) return;
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty('--pct', `${pct}%`);
}

// ── ESTUDIO PRO DE SKINS & CAPAS (ANIMACIÓN + CAPAS 3D POR ZONA + INSPECTOR UV) ──
let skinStudioPose = 'idle'; // 'idle' | 'walk' | 'wave' | 'hero'
let skinStudioAnimPhase = 0;
let skinPartsVisibility = {
  hat: true,
  jacket: true,
  leftSleeve: true,
  rightSleeve: true,
  leftPants: true,
  rightPants: true
};

function setupSkinStudio() {
  document.getElementById('btnStudioSelectFile')?.addEventListener('click', pickCustomSkinFile);

  // Selector de modelo (Clásico 4px / Slim 3px)
  const btnClassic = document.getElementById('btnModelClassic');
  const btnSlim = document.getElementById('btnModelSlim');

  const setModel = async (model) => {
    btnClassic?.classList.toggle('active', model === 'classic');
    btnSlim?.classList.toggle('active', model === 'slim');
    if (currentSkin && currentSkin.dataUrl) {
      const res = await window.doraland.saveSkinData({
        dataUrl: currentSkin.dataUrl,
        model,
        name: currentSkin.name
      });
      if (res?.skin) currentSkin = res.skin;
    } else {
      currentSkin = { ...(currentSkin || {}), model };
    }
    await refreshSkinRenderer();
  };

  btnClassic?.addEventListener('click', () => setModel('classic'));
  btnSlim?.addEventListener('click', () => setModel('slim'));

  // Selector de Escenario (Esmeralda, Oro, Noche, Cuadrícula)
  document.querySelectorAll('#skinSceneSelector .scene-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('#skinSceneSelector .scene-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      const scene = dot.dataset.scene || 'emerald';
      const stage = document.getElementById('skinDropZone');
      if (stage) {
        stage.className = `svp-stage scene-${scene}`;
      }
    });
  });

  // Selector de Pose (Caminando, Estático, Saludando, Héroe)
  document.querySelectorAll('#skinPoseGroup .pose-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#skinPoseGroup .pose-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      skinStudioPose = btn.dataset.pose || 'idle';
      renderAllSkinCanvases();
    });
  });

  // Toggle global de Capa Exterior 3D
  document.getElementById('skinShowOuterLayer')?.addEventListener('change', (e) => {
    const enabled = Boolean(e.target.checked);
    Object.keys(skinPartsVisibility).forEach(k => { skinPartsVisibility[k] = enabled; });
    document.querySelectorAll('#skinPartsChips .part-chip').forEach(chip => {
      chip.classList.toggle('active', enabled);
    });
    renderAllSkinCanvases();
  });

  // Toggles individuales de Capas 3D por zona del cuerpo
  document.querySelectorAll('#skinPartsChips .part-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const partKey = chip.dataset.part;
      if (!partKey) return;
      skinPartsVisibility[partKey] = !skinPartsVisibility[partKey];
      chip.classList.toggle('active', skinPartsVisibility[partKey]);
      const anyActive = Object.values(skinPartsVisibility).some(Boolean);
      const globalToggle = document.getElementById('skinShowOuterLayer');
      if (globalToggle) globalToggle.checked = anyActive;
      renderAllSkinCanvases();
    });
  });

  // Importar por Nickname (función reutilizable para el buscador y los presets)
  const importNickHandler = async (nickToImport) => {
    const nick = (nickToImport || '').trim();
    if (!nick) {
      showNotification('Escribe un nickname de Minecraft primero.', 'error');
      return;
    }
    const btn = document.getElementById('btnImportSkinNick');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    try {
      const res = await window.doraland.importSkinByNick(nick);
      if (res?.error) {
        showNotification(res.error, 'error');
      } else if (res?.skin) {
        currentSkin = res.skin;
        await refreshSkinRenderer();
        showNotification(`¡Skin de ${nick} importada y aplicada!`, 'success');
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Importar'; }
    }
  };

  document.getElementById('btnImportSkinNick')?.addEventListener('click', () => {
    const input = document.getElementById('inputSkinNick');
    importNickHandler(input?.value || '');
  });

  document.getElementById('inputSkinNick')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') importNickHandler(e.target.value || '');
  });

  // Exportar / Guardar copia .PNG de la skin actual
  document.getElementById('btnExportSkinPng')?.addEventListener('click', () => {
    if (!loadedSkinImage) {
      showNotification('No hay una textura PNG personalizada u online cargada para exportar.', 'info');
      return;
    }
    const off = document.createElement('canvas');
    off.width = loadedSkinImage.width || 64;
    off.height = loadedSkinImage.height || 64;
    const octx = off.getContext('2d');
    octx.imageSmoothingEnabled = false;
    octx.drawImage(loadedSkinImage, 0, 0);
    const a = document.createElement('a');
    a.href = off.toDataURL('image/png');
    a.download = currentSkin?.name || `skin-${currentSession?.name || 'doraland'}.png`;
    a.click();
    showNotification('Textura .PNG exportada correctamente.', 'success');
  });

  // Restablecer skin
  document.getElementById('btnResetSkin')?.addEventListener('click', async () => {
    await window.doraland.resetSkin();
    currentSkin = null;
    loadedSkinImage = null;
    await refreshSkinRenderer();
    showNotification('Skin restablecida al modelo por defecto.', 'info');
  });

  // Drag & Drop de archivo PNG en el escenario de Skin
  const dropZone = document.getElementById('skinDropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer?.files?.[0];
      if (!file || !file.name.toLowerCase().endsWith('.png')) {
        showNotification('Por favor suelta un archivo en formato .PNG.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const res = await window.doraland.saveSkinData({
          dataUrl: reader.result,
          model: currentSkin?.model || 'classic',
          name: file.name
        });
        if (res?.error) {
          showNotification(res.error, 'error');
        } else if (res?.skin) {
          currentSkin = res.skin;
          await refreshSkinRenderer();
          showNotification(`Skin "${file.name}" cargada y lista para jugar.`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Bucle de animación del Estudio de Skin (se ejecuta solo cuando #screenSkin está activo)
  function animateStudioPoses() {
    const skinScreen = document.getElementById('screenSkin');
    const isSkinScreenActive = skinScreen && skinScreen.classList.contains('active');
    if (isSkinScreenActive && !document.hidden && !isLaunching && !currentSettings.lowSpecUi && skinStudioPose !== 'idle') {
      skinStudioAnimPhase += 0.085;
      const showOuter = document.getElementById('skinShowOuterLayer')?.checked !== false;
      const slim = currentSkin?.model === 'slim';
      const frontCanvas = document.getElementById('studioSkinFront');
      const backCanvas = document.getElementById('studioSkinBack');
      if (frontCanvas) drawMinecraftCharacter(frontCanvas, loadedSkinImage, 'front', showOuter, slim, skinStudioPose, skinStudioAnimPhase);
      if (backCanvas) drawMinecraftCharacter(backCanvas, loadedSkinImage, 'back', showOuter, slim, skinStudioPose, skinStudioAnimPhase);
    }
    setTimeout(() => requestAnimationFrame(animateStudioPoses), 45);
  }
  requestAnimationFrame(animateStudioPoses);
}

// ── SELECTOR DE CAPAS OFICIALES DE CUENTA (EXCLUSIVO PREMIUM) ─
let lastLoadedCapeUuid = null;
let lastCapeSyncOk = false;
let ownedAccountCapes = [];
let capeSyncInFlight = null;

function setupCapeSelector() {
  document.getElementById('btnUnlockCapesPremium')?.addEventListener('click', () => {
    loginMicrosoft();
  });

  document.getElementById('btnRefreshCapes')?.addEventListener('click', async () => {
    if (currentSession?.meta?.type !== 'msa') {
      showNotification('Conecta tu cuenta Premium de Microsoft para sincronizar tus capas.', 'info');
      return;
    }
    const res = await updateCapeUIForSession(currentSession, true);
    if (res?.tokenExpired) {
      showNotification('Tu sesión Microsoft caducó. Conecta de nuevo tu cuenta Premium para ver todas tus capas.', 'info');
    } else if (Array.isArray(res?.capes)) {
      showNotification(
        res.capes.length > 0
          ? `Se detectaron ${res.capes.length} capa(s) en tu cuenta Premium.`
          : 'Tu cuenta Premium no posee capas oficiales actualmente.',
        'info'
      );
    }
  });

  updateCapeUIForSession(currentSession);
}

function renderOwnedCapesGrid(capes = [], tokenExpired = false) {
  const grid = document.getElementById('capeGrid');
  const emptyMsg = document.getElementById('capeEmptyMsg');
  if (!grid) return;

  grid.innerHTML = '';

  const buildButton = ({ id, name, dataUrl }) => {
    const btn = document.createElement('button');
    btn.className = 'cape-item';
    btn.dataset.capeId = id;

    if (id === 'none') {
      const swatch = document.createElement('span');
      swatch.className = 'cape-swatch cape-none';
      btn.appendChild(swatch);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = 22;
      canvas.height = 34;
      canvas.className = 'cape-preview-canvas';
      btn.appendChild(canvas);
      if (dataUrl) {
        loadImageElement(dataUrl).then(img => {
          const cctx = canvas.getContext('2d');
          cctx.imageSmoothingEnabled = false;
          cctx.clearRect(0, 0, canvas.width, canvas.height);
          cctx.drawImage(img, 1, 1, 10, 16, 0, 0, canvas.width, canvas.height);
        }).catch(() => {});
      }
    }

    const lbl = document.createElement('span');
    lbl.textContent = name;
    btn.appendChild(lbl);

    btn.addEventListener('click', async () => {
      const isPremium = currentSession?.meta?.type === 'msa';
      if (!isPremium) {
        showNotification('El Selector de Capas es un beneficio exclusivo para Cuentas Premium.', 'error');
        return;
      }
      const res = await window.doraland.equipAccountCape({ id });
      if (res?.error) {
        showNotification(res.error, 'error');
        return;
      }
      if (res?.cape) {
        currentCape = res.cape;
        await refreshCapeState();
        renderAllSkinCanvases();
        showNotification(
          currentCape.id === 'none' ? 'Capa ocultada.' : `Capa equipada: ${currentCape.name}`,
          'success'
        );
      }
    });

    return btn;
  };

  // Opción para ocultar capa + únicamente las capas reales que posee el usuario Premium en su cuenta
  grid.appendChild(buildButton({ id: 'none', name: 'Sin Capa', dataUrl: null }));
  for (const cape of capes) {
    grid.appendChild(buildButton(cape));
  }

  if (emptyMsg) {
    if (capes.length === 0) {
      emptyMsg.style.display = 'block';
      if (tokenExpired) {
        emptyMsg.innerHTML = 'Tu sesión Microsoft caducó y no permite listar capas inactivas. <a href="#" id="linkReloginCapes" style="color:var(--gold-light);font-weight:800;text-decoration:underline;">Volver a conectar Microsoft</a>';
        document.getElementById('linkReloginCapes')?.addEventListener('click', (e) => {
          e.preventDefault();
          loginMicrosoft();
        });
      } else {
        emptyMsg.textContent = 'Tu cuenta Premium no posee capas oficiales de Minecraft actualmente.';
      }
    } else {
      emptyMsg.style.display = 'none';
      emptyMsg.textContent = '';
    }
  }
}

async function refreshCapeState() {
  const activeId = currentCape?.id || 'none';
  document.querySelectorAll('#capeGrid .cape-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.capeId === activeId);
  });
  if (activeId !== 'none' && currentCape?.dataUrl) {
    try {
      loadedCapeImage = await loadImageElement(currentCape.dataUrl);
    } catch {
      loadedCapeImage = null;
    }
  } else {
    loadedCapeImage = null;
  }
}

async function updateCapeUIForSession(session, force = false) {
  const isPremium = session?.meta?.type === 'msa';
  const lockedBox = document.getElementById('capeLockedBox');
  const optionsWrap = document.getElementById('capeOptionsWrap');
  const emptyMsg = document.getElementById('capeEmptyMsg');
  const refreshBtn = document.getElementById('btnRefreshCapes');

  if (lockedBox) lockedBox.style.display = isPremium ? 'none' : 'flex';
  if (refreshBtn) refreshBtn.style.display = isPremium ? 'inline-flex' : 'none';
  if (optionsWrap) {
    optionsWrap.classList.toggle('locked', !isPremium);
  }

  if (!isPremium) {
    lastLoadedCapeUuid = null;
    lastCapeSyncOk = false;
    ownedAccountCapes = [];
    currentCape = { id: 'none', name: 'Sin Capa', dataUrl: null };
    const grid = document.getElementById('capeGrid');
    if (grid) grid.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'none';
    await refreshCapeState();
    return null;
  }

  if (!force && lastLoadedCapeUuid === session.uuid && lastCapeSyncOk) {
    await refreshCapeState();
    return { capes: ownedAccountCapes, tokenExpired: false };
  }

  if (capeSyncInFlight) {
    return capeSyncInFlight;
  }

  if (emptyMsg && ownedAccountCapes.length === 0) {
    emptyMsg.style.display = 'block';
    emptyMsg.textContent = 'Sincronizando capas de tu cuenta Premium...';
  }

  capeSyncInFlight = (async () => {
    try {
      const res = await window.doraland.getOwnedCapes();
      if (res?.updatedSession) {
        currentSession = res.updatedSession;
      }
      lastLoadedCapeUuid = session.uuid;
      lastCapeSyncOk = !res?.tokenExpired;
      ownedAccountCapes = Array.isArray(res?.capes) ? res.capes : [];
      if (res?.selectedCape) {
        currentCape = res.selectedCape;
      }
      renderOwnedCapesGrid(ownedAccountCapes, Boolean(res?.tokenExpired));
      await refreshCapeState();
      renderAllSkinCanvases();
      return res;
    } catch {
      lastCapeSyncOk = false;
      renderOwnedCapesGrid([], false);
      return null;
    } finally {
      capeSyncInFlight = null;
    }
  })();

  return capeSyncInFlight;
}

async function pickCustomSkinFile() {
  const res = await window.doraland.selectSkinFile();
  if (res?.canceled) return;
  if (res?.error) {
    showNotification(res.error, 'error');
    return;
  }
  if (res?.skin) {
    currentSkin = res.skin;
    await refreshSkinRenderer();
    showNotification(`¡Skin "${currentSkin.name}" aplicada correctamente!`, 'success');
  }
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function updateRawTextureInspector(img, sourceName) {
  const rawCanvas = document.getElementById('skinRawTextureCanvas');
  const formatBadge = document.getElementById('skinFormatBadge');
  const modelBadge = document.getElementById('skinModelBadge');
  const slim = currentSkin?.model === 'slim';

  if (modelBadge) {
    modelBadge.textContent = slim ? 'MODELO ALEX (3PX)' : 'MODELO STEVE (4PX)';
  }

  if (!rawCanvas) return;
  const rctx = rawCanvas.getContext('2d');
  rctx.imageSmoothingEnabled = false;
  rctx.clearRect(0, 0, rawCanvas.width, rawCanvas.height);

  if (img) {
    rctx.drawImage(img, 0, 0, rawCanvas.width, rawCanvas.height);
    const dims = `${img.width}×${img.height}`;
    if (formatBadge) formatBadge.textContent = `TEXTURA ${dims}`;
    safeText('skinTexTitle', sourceName || 'Textura Activa');
    safeText('skinTexDims', `Mapa UV ${dims}px • ${img.height === 32 ? 'Formato Legacy' : 'Formato Moderno 2 Capas'}`);
  } else {
    rctx.fillStyle = '#1A0507';
    rctx.fillRect(6, 6, 32, 32);
    rctx.fillStyle = '#F59E0B';
    rctx.fillRect(12, 12, 20, 20);
    if (formatBadge) formatBadge.textContent = 'TEXTURA 64×64';
    safeText('skinTexTitle', 'Explorador Web SMP (Base)');
    safeText('skinTexDims', 'Sube o arrastra un archivo .PNG al escenario');
  }
}

async function refreshSkinRenderer() {
  const model = currentSkin?.model || 'classic';
  document.getElementById('btnModelClassic')?.classList.toggle('active', model === 'classic');
  document.getElementById('btnModelSlim')?.classList.toggle('active', model === 'slim');
  await refreshCapeState();

  if (currentSkin && currentSkin.dataUrl) {
    safeText('skinCurrentName', `Skin activa: ${currentSkin.name || 'Personalizada.png'}`);
    safeText('homeSkinBadge', 'Personalizada');
    safeText('homeSkinNameLabel', currentSkin.name || 'Skin personalizada activa');
    try {
      loadedSkinImage = await loadImageElement(currentSkin.dataUrl);
      updateRawTextureInspector(loadedSkinImage, currentSkin.name || 'Personalizada.png');
      renderAllSkinCanvases();
      return;
    } catch {}
  }

  // Si no hay skin subida localmente, intentar cargar la skin online del jugador actual
  if (currentSession?.name) {
    safeText('skinCurrentName', `Skin de ${currentSession.name}`);
    safeText('homeSkinBadge', currentSession.meta?.type === 'msa' ? 'Premium' : 'Estándar');
    safeText('homeSkinNameLabel', `Skin de ${currentSession.name}`);
    try {
      loadedSkinImage = await loadImageElement(`https://mc-heads.net/skin/${encodeURIComponent(currentSession.name)}`);
      updateRawTextureInspector(loadedSkinImage, `${currentSession.name}.png`);
      renderAllSkinCanvases();
      return;
    } catch {}
  }

  loadedSkinImage = null;
  updateRawTextureInspector(null, null);
  safeText('skinCurrentName', 'Skin por defecto (Explorador Web SMP)');
  safeText('homeSkinBadge', 'Por defecto');
  safeText('homeSkinNameLabel', 'Explorador Web SMP');
  renderAllSkinCanvases();
}

function renderAllSkinCanvases() {
  const showOuter = document.getElementById('skinShowOuterLayer')?.checked !== false;
  const slim = currentSkin?.model === 'slim';

  const homeCanvas = document.getElementById('homeSkinCanvas');
  const frontCanvas = document.getElementById('studioSkinFront');
  const backCanvas = document.getElementById('studioSkinBack');
  const avatarCanvas = document.getElementById('sidebarAvatarCanvas');
  const avatarImg = document.getElementById('userAvatar');

  if (homeCanvas) drawMinecraftCharacter(homeCanvas, loadedSkinImage, 'front', showOuter, slim, 'idle', 0);
  if (frontCanvas) drawMinecraftCharacter(frontCanvas, loadedSkinImage, 'front', showOuter, slim, skinStudioPose, skinStudioAnimPhase);
  if (backCanvas) drawMinecraftCharacter(backCanvas, loadedSkinImage, 'back', showOuter, slim, skinStudioPose, skinStudioAnimPhase);

  if (avatarCanvas && avatarImg) {
    if (loadedSkinImage) {
      avatarCanvas.style.display = 'block';
      avatarImg.style.display = 'none';
      drawMinecraftHeadAvatar(avatarCanvas, loadedSkinImage, showOuter);
    } else {
      avatarCanvas.style.display = 'block';
      avatarImg.style.display = 'none';
      drawMinecraftHeadAvatar(avatarCanvas, null, true);
    }
  }
}

function drawMinecraftHeadAvatar(canvas, skinImg, showOuter = true) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (skinImg) {
    ctx.drawImage(skinImg, 8, 8, 8, 8, 0, 0, canvas.width, canvas.height);
    if (showOuter && skinPartsVisibility.hat) {
      ctx.drawImage(skinImg, 40, 8, 8, 8, 0, 0, canvas.width, canvas.height);
    }
  } else {
    // Avatar pixelado estilo Web SMP cuando está offline o sin sesión
    ctx.fillStyle = '#1A0A0D';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#D29B6E';
    ctx.fillRect(4, 6, 30, 28);
    ctx.fillStyle = '#3A1E14';
    ctx.fillRect(4, 4, 30, 9);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(8, 17, 3, 5);
    ctx.fillRect(23, 17, 3, 5);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(11, 17, 4, 5);
    ctx.fillRect(26, 17, 4, 5);
    ctx.fillStyle = '#78351B';
    ctx.fillRect(14, 26, 10, 4);
  }
}

function drawCapeOnBack(ctx, ox, oy, scale, pose = 'idle', phase = 0) {
  const isPremium = currentSession?.meta?.type === 'msa';
  const capeId = currentCape?.id || 'none';
  if (!isPremium || capeId === 'none' || !loadedCapeImage) return;

  const waveX = pose === 'walk' ? Math.sin(phase) * 0.45 * scale : pose === 'hero' ? Math.sin(phase * 1.3) * 0.65 * scale : 0;
  const waveLift = pose === 'hero' ? 0.8 * scale : pose === 'walk' ? Math.abs(Math.cos(phase)) * 0.35 * scale : 0;

  const cx = Math.round(ox + 3 * scale + waveX * 0.5);
  const cy = Math.round(oy + 8 * scale);
  const cw = Math.round(10 * scale);
  const ch = Math.round(16 * scale - waveLift);

  // Sombra 3D proyectada sobre la espalda y piernas
  ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
  ctx.fillRect(cx + 3, cy + 3, cw, ch);

  ctx.drawImage(loadedCapeImage, 1, 1, 10, 16, cx, cy, cw, ch);
}

function drawMinecraftCharacter(canvas, skinImg, view = 'front', showOuter = true, slim = false, pose = 'idle', phase = 0) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Escala en píxeles por unidad de modelo (modelo total: 16 unidades de ancho x 32 unidades de alto)
  const scale = Math.min(Math.floor(canvas.width / 19), Math.floor(canvas.height / 35));
  const ox = Math.floor((canvas.width - 16 * scale) / 2);
  const oy = Math.floor((canvas.height - 32 * scale) / 2);
  const armW = slim ? 3 : 4;
  const leftArmX = slim ? 1 : 0;
  const rightArmX = 12;

  // Cálculo de offsets dinámicos según la pose seleccionada
  let headBobY = 0;
  let headTiltX = 0;
  let lArmDY = 0;
  let rArmDY = 0;
  let lLegDY = 0;
  let rLegDY = 0;
  let lArmDX = 0;
  let rArmDX = 0;

  if (pose === 'walk') {
    const s = Math.sin(phase);
    headBobY = Math.abs(Math.cos(phase)) * 0.35;
    lArmDY = s * 1.4;
    rArmDY = -s * 1.4;
    lLegDY = -s * 1.3;
    rLegDY = s * 1.3;
  } else if (pose === 'wave') {
    const w = Math.sin(phase * 1.8);
    headTiltX = 0.25;
    lArmDY = -2.4 + w * 0.45;
    lArmDX = -0.45 + w * 0.25;
  } else if (pose === 'hero') {
    const b = Math.sin(phase * 0.9);
    headBobY = b * 0.2;
    lArmDX = -0.5;
    rArmDX = 0.5;
    lArmDY = -0.4;
    rArmDY = -0.4;
  }

  const showHat = showOuter && skinPartsVisibility.hat;
  const showJacket = showOuter && skinPartsVisibility.jacket;
  const showLSleeve = showOuter && skinPartsVisibility.leftSleeve;
  const showRSleeve = showOuter && skinPartsVisibility.rightSleeve;
  const showLPants = showOuter && skinPartsVisibility.leftPants;
  const showRPants = showOuter && skinPartsVisibility.rightPants;

  if (!skinImg) {
    // Render estilizado por defecto (Explorador de Doraland) con pose dinámica
    ctx.fillStyle = '#4A2E1B';
    ctx.fillRect(ox + (4 + headTiltX) * scale, oy + headBobY * scale, 8 * scale, 8 * scale);
    ctx.fillStyle = '#D8A074';
    ctx.fillRect(ox + (4 + headTiltX) * scale, oy + (headBobY + (view === 'front' ? 2 : 5)) * scale, 8 * scale, (view === 'front' ? 6 : 3) * scale);
    if (view === 'front') {
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(ox + (5 + headTiltX) * scale, oy + (4 + headBobY) * scale, 2 * scale, 1 * scale);
      ctx.fillRect(ox + (9 + headTiltX) * scale, oy + (4 + headBobY) * scale, 2 * scale, 1 * scale);
    }
    // Torso
    ctx.fillStyle = '#1A0507';
    ctx.fillRect(ox + 4 * scale, oy + 8 * scale, 8 * scale, 12 * scale);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(ox + 4 * scale, oy + 17 * scale, 8 * scale, 2 * scale);
    // Brazos
    ctx.fillStyle = '#166534';
    ctx.fillRect(ox + (leftArmX + lArmDX) * scale, oy + (8 + lArmDY) * scale, armW * scale, 9 * scale);
    ctx.fillRect(ox + (rightArmX + rArmDX) * scale, oy + (8 + rArmDY) * scale, armW * scale, 9 * scale);
    ctx.fillStyle = '#D8A074';
    ctx.fillRect(ox + (leftArmX + lArmDX) * scale, oy + (17 + lArmDY) * scale, armW * scale, 3 * scale);
    ctx.fillRect(ox + (rightArmX + rArmDX) * scale, oy + (17 + rArmDY) * scale, armW * scale, 3 * scale);
    // Piernas
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(ox + 4 * scale, oy + (20 + lLegDY) * scale, 4 * scale, 12 * scale);
    ctx.fillRect(ox + 8 * scale, oy + (20 + rLegDY) * scale, 4 * scale, 12 * scale);
    if (view === 'back') {
      drawCapeOnBack(ctx, ox, oy, scale, pose, phase);
    }
    return;
  }

  const isLegacy64x32 = skinImg.height === 32;

  const part = (sx, sy, sw, sh, dx, dy, dw = sw, dh = sh) => {
    ctx.drawImage(skinImg, sx, sy, sw, sh, ox + dx * scale, oy + dy * scale, dw * scale, dh * scale);
  };

  // Sombreado volumétrico 3D para dar relieve a extremidades y torso
  const shadeRect = (dx, dy, dw, dh, alpha = 0.16) => {
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(ox + dx * scale, oy + dy * scale, dw * scale, dh * scale);
  };

  if (view === 'front') {
    // Pierna Derecha
    part(4, 20, 4, 12, 4, 20 + lLegDY);
    if (showRPants && !isLegacy64x32) part(4, 36, 4, 12, 3.85, 19.85 + lLegDY, 4.3, 12.3);
    if (lLegDY > 0.2) shadeRect(4, 20 + lLegDY, 4, 12, 0.15);

    // Pierna Izquierda
    if (isLegacy64x32) {
      part(4, 20, 4, 12, 8, 20 + rLegDY);
    } else {
      part(20, 52, 4, 12, 8, 20 + rLegDY);
      if (showLPants) part(4, 52, 4, 12, 7.85, 19.85 + rLegDY, 4.3, 12.3);
    }
    if (rLegDY > 0.2) shadeRect(8, 20 + rLegDY, 4, 12, 0.15);

    // Torso + Chaqueta
    part(20, 20, 8, 12, 4, 8);
    if (showJacket && !isLegacy64x32) part(20, 36, 8, 12, 3.85, 7.85, 8.3, 12.3);
    shadeRect(4, 19, 8, 1, 0.2);

    // Brazo Derecho (a la izquierda del visor)
    part(44, 20, armW, 12, leftArmX + lArmDX, 8 + lArmDY);
    if (showRSleeve && !isLegacy64x32) part(44, 36, armW, 12, leftArmX + lArmDX - 0.15, 7.85 + lArmDY, armW + 0.3, 12.3);
    shadeRect(leftArmX + lArmDX + armW - 0.6, 8 + lArmDY, 0.6, 12, 0.18);

    // Brazo Izquierdo (a la derecha del visor)
    if (isLegacy64x32) {
      part(44, 20, armW, 12, rightArmX + rArmDX, 8 + rArmDY);
    } else {
      part(36, 52, armW, 12, rightArmX + rArmDX, 8 + rArmDY);
      if (showLSleeve) part(52, 52, armW, 12, rightArmX + rArmDX - 0.15, 7.85 + rArmDY, armW + 0.3, 12.3);
    }
    shadeRect(rightArmX + rArmDX, 8 + rArmDY, 0.6, 12, 0.18);

    // Cabeza base + Sombrero 3D
    part(8, 8, 8, 8, 4 + headTiltX, 0 + headBobY);
    if (showHat) part(40, 8, 8, 8, 3.7 + headTiltX, -0.3 + headBobY, 8.6, 8.6);
  } else {
    // VISTA TRASERA
    if (isLegacy64x32) {
      part(12, 20, 4, 12, 4, 20 + rLegDY);
      part(12, 20, 4, 12, 8, 20 + lLegDY);
    } else {
      part(28, 52, 4, 12, 4, 20 + rLegDY);
      if (showLPants) part(12, 52, 4, 12, 3.85, 19.85 + rLegDY, 4.3, 12.3);
      part(12, 20, 4, 12, 8, 20 + lLegDY);
      if (showRPants) part(12, 36, 4, 12, 7.85, 19.85 + lLegDY, 4.3, 12.3);
    }

    part(32, 20, 8, 12, 4, 8);
    if (showJacket && !isLegacy64x32) part(32, 36, 8, 12, 3.85, 7.85, 8.3, 12.3);

    // Brazos traseros
    const rArmBackX = slim ? 51 : 52;
    const lArmBackX = slim ? 43 : 44;
    if (isLegacy64x32) {
      part(rArmBackX, 20, armW, 12, leftArmX - rArmDX, 8 + rArmDY);
      part(rArmBackX, 20, armW, 12, rightArmX - lArmDX, 8 + lArmDY);
    } else {
      part(lArmBackX, 52, armW, 12, leftArmX - rArmDX, 8 + rArmDY);
      part(rArmBackX, 20, armW, 12, rightArmX - lArmDX, 8 + lArmDY);
    }

    part(24, 8, 8, 8, 4 - headTiltX, 0 + headBobY);
    if (showHat) part(56, 8, 8, 8, 3.7 - headTiltX, -0.3 + headBobY, 8.6, 8.6);

    // Capa sobre la espalda (solo Cuentas Premium) con animación de ondeo
    drawCapeOnBack(ctx, ox, oy, scale, pose, phase);
  }
}

// ── MONETIZACIÓN CON GOOGLE ADS (ADSENSE + FALLBACK) ──────────
function setupGoogleAds(adsCfg) {
  const homeSlot = document.getElementById('adSlotHome');

  if (adsCfg && adsCfg.enabled === false) {
    if (homeSlot) homeSlot.style.display = 'none';
    return;
  }

  const promo = adsCfg?.fallbackPromo || {};
  const ctaUrl = promo.ctaUrl || config?.ui?.discordUrl || 'https://discord.gg/nR9c4czkt7';

  safeText('adHomeBadge', promo.badge || 'GOOGLE ADS • ESPACIO PATROCINADO');
  safeText('adHomeTitle', promo.title || 'Comunidad Oficial Doraland • Eventos y Rangos');
  safeText('adHomeSubtitle', promo.subtitle || 'Únete a nuestro Discord oficial para sorteos, soporte y novedades del servidor.');
  safeText('adHomeCta', promo.ctaText || 'Unirse al Discord');

  const openPromo = () => window.doraland.openExternal(ctaUrl);
  document.getElementById('adHomeCta')?.addEventListener('click', openPromo);

  // Si el administrador configuró un Client ID real de Google AdSense (ca-pub-XXXX)
  const clientId = adsCfg?.clientId || '';
  const hasRealAdSense = clientId.startsWith('ca-pub-') && !clientId.includes('0000000000');

  if (hasRealAdSense) {
    try {
      const mountHome = document.getElementById('adHomeMount');
      const fallbackEl = document.getElementById('adHomeFallback');

      if (mountHome && adsCfg?.slots?.homeHorizontal) {
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'none';
        ins.dataset.adClient = clientId;
        ins.dataset.adSlot = adsCfg.slots.homeHorizontal;
        ins.dataset.adFormat = 'horizontal';
        ins.dataset.fullWidthResponsive = 'true';
        mountHome.prepend(ins);

        const syncAdSlotLayout = () => {
          const status = ins.getAttribute('data-ad-status');
          const iframe = ins.querySelector('iframe');
          const iframeH = iframe ? iframe.getBoundingClientRect().height : 0;
          const isFilled = status === 'filled' || iframeH > 10;

          if (isFilled) {
            const clampedH = iframeH > 10 ? Math.min(Math.round(iframeH), 155) : 'auto';
            ins.style.display = 'block';
            ins.style.height = clampedH === 'auto' ? 'auto' : `${clampedH}px`;
            if (iframe) iframe.style.maxHeight = '155px';
            if (fallbackEl) fallbackEl.style.display = 'none';
          } else {
            ins.style.display = 'none';
            ins.style.height = '0px';
            if (fallbackEl) fallbackEl.style.display = 'flex';
          }
        };

        const adObserver = new MutationObserver(syncAdSlotLayout);
        adObserver.observe(ins, {
          attributes: true,
          attributeFilter: ['data-ad-status', 'style'],
          childList: true,
          subtree: true
        });
        if (typeof ResizeObserver !== 'undefined') {
          const resizeObs = new ResizeObserver(syncAdSlotLayout);
          resizeObs.observe(ins);
        }

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
        script.crossOrigin = 'anonymous';
        script.onerror = () => syncAdSlotLayout();
        document.head.appendChild(script);

        (window.adsbygoogle = window.adsbygoogle || []).push({});
        syncAdSlotLayout();
      }
    } catch {}
  }
}

// ── BOTÓN JUGAR Y LANZAMIENTO ──────────────────────────────────
function setupPlayButton() {
  const btn = document.getElementById('btnPlay');
  if (!btn) return;
  btn.onclick = startGame;
}

async function startGame() {
  if (isLaunching) return;

  if (!currentSession) {
    showNotification('Inicia sesión primero para entrar al servidor.', 'error');
    showScreen('screenLogin');
    return;
  }

  isLaunching = true;
  setPlayButtonState('launching');

  const ram = parseInt(currentSettings.ram || 6144);
  logToConsole('Iniciando Web SMP Launcher...', 'info');
  logToConsole(`RAM: ${(ram / 1024).toFixed(1)} GB • Resolución: ${currentSettings.fullscreen ? 'Pantalla Completa' : `${currentSettings.resolutionWidth}x${currentSettings.resolutionHeight}`}`, 'info');

  showProgressSection(true);
  updateProgress(0, 'Verificando entorno y actualizaciones...');

  try {
    const result = await window.doraland.launchGame({ session: currentSession, ram });
    if (result && result.error) {
      isLaunching = false;
      setPlayButtonState('ready');
      showProgressSection(false);
      showNotification(result.error, 'error');
      logToConsole('ERROR: ' + result.error, 'error');
    }
  } catch (err) {
    isLaunching = false;
    setPlayButtonState('ready');
    showProgressSection(false);
    showNotification(err.message || 'Error inesperado al lanzar', 'error');
    logToConsole(err.message || 'Error inesperado al lanzar', 'error');
  }
}

function setupLaunchEvents() {
  window.doraland.onLaunchLog((data) => {
    logToConsole(data.msg || '', data.type || 'debug');
  });

  window.doraland.onLaunchProgress((progress) => {
    const type = progress.type || '';
    const task = progress.task || 0;
    const total = progress.total || 1;
    const pct = Math.round((task / total) * 100);
    updateProgress(pct, `Descargando: ${type} (${task}/${total})`);
  });

  window.doraland.onLaunchStatus((data) => {
    if (data.status === 'launched') {
      setPlayButtonState('running');
      updateProgress(100, '¡Web SMP está en ejecución!');
      logToConsole('¡Juego iniciado correctamente!', 'info');
    } else if (data.status === 'error') {
      isLaunching = false;
      setPlayButtonState('ready');
      showProgressSection(false);
      showNotification(data.message, 'error');
      logToConsole('ERROR: ' + data.message, 'error');
    }
  });

  window.doraland.onLaunchClose((code) => {
    isLaunching = false;
    setPlayButtonState('ready');
    showProgressSection(false);
    logToConsole(`Minecraft cerrado (código: ${code})`, 'info');
  });

  window.doraland.onLaunchCrashReport((report) => {
    showCrashHelperModal(report);
  });
}

async function runRepairInstallation() {
  const btn = document.getElementById('btnSettingsRepairInstall');
  const crashRepairBtn = document.getElementById('btnCrashRepair');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Reparando archivos y verificando Java...';
  }
  if (crashRepairBtn) {
    crashRepairBtn.disabled = true;
    crashRepairBtn.textContent = 'Reparando...';
  }
  showNotification('Reparando instalación (tus controles, mundos y capturas están protegidos)...', 'info');

  try {
    const res = await window.doraland.repairInstallation();
    if (res?.success) {
      const msg = res.javaValid
        ? `¡Instalación reparada! Archivos dañados limpiados: ${res.removedCorrupt}.`
        : `Archivos reparados (${res.removedCorrupt} limpiados), aviso Java: ${res.javaReason || 'verifica Java 21'}.`;
      showNotification(msg, res.javaValid ? 'success' : 'error');
    } else {
      showNotification(res?.error || 'No se pudo completar la reparación.', 'error');
    }
  } catch (err) {
    showNotification('Error al reparar: ' + (err.message || 'desconocido'), 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `${getSvgIcon('wrench', 14)} Reparar Instalación (Protege Controles y Mundos)`;
    }
    if (crashRepairBtn) {
      crashRepairBtn.disabled = false;
      crashRepairBtn.textContent = 'Reparar Instalación';
    }
  }
}

function showCrashHelperModal(report) {
  const modal = document.getElementById('crashHelperModal');
  if (!modal || !report) return;

  safeText('crashTitle', report.title || 'Cierre inesperado del juego');
  safeText('crashCause', report.cause || 'El juego finalizó de forma inesperada.');
  safeText('crashFix', report.fix || 'Ejecuta Reparar Instalación en Ajustes.');
  const snippetEl = document.getElementById('crashSnippet');
  if (snippetEl) {
    snippetEl.textContent = report.snippet || `Código de salida: ${report.code}`;
    snippetEl.style.display = report.snippet ? 'block' : 'none';
  }

  modal.style.display = 'flex';

  const closeModal = () => { modal.style.display = 'none'; };
  document.getElementById('btnCloseCrashModal').onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };

  document.getElementById('btnCrashRepair').onclick = async () => {
    closeModal();
    showScreen('screenSettings');
    await runRepairInstallation();
  };

  document.getElementById('btnCrashCopy').onclick = async () => {
    const fullText = [
      `Diagnóstico Web SMP (${report.title})`,
      `Código: ${report.code}`,
      `Causa: ${report.cause}`,
      `Recomendación: ${report.fix}`,
      report.snippet ? `\nDetalle técnico:\n${report.snippet}` : ''
    ].join('\n');
    try {
      await navigator.clipboard.writeText(fullText);
      showNotification('Diagnóstico copiado al portapapeles.', 'success');
    } catch {
      showNotification('No se pudo copiar al portapapeles.', 'error');
    }
  };

  document.getElementById('btnCrashDiscord').onclick = () => {
    const url = config?.ui?.discordUrl || 'https://discord.gg/nR9c4czkt7';
    window.doraland.openExternal(url);
  };
}

function setPlayButtonState(state) {
  const btn = document.getElementById('btnPlay');
  if (!btn) return;

  const states = {
    ready:     { text: '¡JUGAR EN WEB SMP!', disabled: false },
    launching: { text: 'PREPARANDO E INICIANDO...', disabled: true },
    running:   { text: 'JUGANDO EN WEB SMP...', disabled: true }
  };

  const s = states[state] || states.ready;
  btn.disabled = s.disabled;
  btn.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>${s.text}</span>`;
}

function showProgressSection(show) {
  const section = document.getElementById('progressSection');
  if (section) section.style.display = show ? 'block' : 'none';
}

function updateProgress(pct, text) {
  const bar = document.getElementById('progressBar');
  const textEl = document.getElementById('progressText');
  const pctEl = document.getElementById('progressPercent');
  if (bar) bar.style.width = `${pct}%`;
  if (textEl) textEl.textContent = text;
  if (pctEl) pctEl.textContent = `${pct}%`;
}

// ── CONSOLA ────────────────────────────────────────────────────
function setupConsole() {
  const toggle = document.getElementById('consoleToggle');
  const box = document.getElementById('consoleBox');
  const arrow = document.getElementById('consoleArrow');
  const clearBtn = document.getElementById('consoleClear');

  toggle?.addEventListener('click', () => {
    consoleOpen = !consoleOpen;
    box?.classList.toggle('open', consoleOpen);
    arrow?.classList.toggle('open', consoleOpen);
  });

  clearBtn?.addEventListener('click', () => {
    const output = document.getElementById('consoleOutput');
    if (output) output.innerHTML = '<span class="console-line info">Consola limpiada.</span>';
  });
}

let pendingConsoleLogs = [];
let consoleFlushScheduled = false;

function logToConsole(msg, type = 'debug') {
  pendingConsoleLogs.push({ msg, type, time: new Date().toLocaleTimeString() });
  if (!consoleFlushScheduled) {
    consoleFlushScheduled = true;
    requestAnimationFrame(flushConsoleLogs);
  }
}

function flushConsoleLogs() {
  consoleFlushScheduled = false;
  const output = document.getElementById('consoleOutput');
  if (!output || pendingConsoleLogs.length === 0) {
    pendingConsoleLogs = [];
    return;
  }

  const batch = pendingConsoleLogs.splice(0, pendingConsoleLogs.length);
  const frag = document.createDocumentFragment();
  for (const item of batch) {
    const line = document.createElement('span');
    line.className = `console-line ${item.type}`;
    line.textContent = `[${item.time}] ${item.msg}`;
    frag.appendChild(line);
  }
  output.appendChild(frag);
  output.scrollTop = output.scrollHeight;

  const lines = output.querySelectorAll('.console-line');
  if (lines.length > 400) {
    const excess = lines.length - 400;
    for (let i = 0; i < excess; i++) lines[i].remove();
  }
}

// ── CENTRO DE PACKS DE TEXTURAS Y SHADERS ─────────────────────
function setupAddonsCenter() {
  document.querySelectorAll('.addon-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.addon-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentAddonCategory = tab.dataset.addonCat || 'resourcepack';

      const localBtn = document.getElementById('btnInstallLocalAddon');
      if (localBtn) {
        localBtn.innerHTML = `${getSvgIcon('folder', 13)} Instalar desde mi PC (.ZIP)`;
      }

      const searchInput = document.getElementById('addonSearchInput');
      if (searchInput) {
        searchInput.placeholder = currentAddonCategory === 'resourcepack'
          ? 'Buscar Resource Packs compatibles...'
          : 'Buscar Shaders compatibles...';
      }

      renderUserInstalledAddons();
      loadCatalogForCurrentCategory(searchInput?.value || '');
    });
  });

  document.getElementById('btnAddonSearch')?.addEventListener('click', () => {
    const q = document.getElementById('addonSearchInput')?.value || '';
    loadCatalogForCurrentCategory(q);
  });

  document.getElementById('addonSearchInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      loadCatalogForCurrentCategory(e.target.value || '');
    }
  });

  document.getElementById('btnInstallLocalAddon')?.addEventListener('click', async () => {
    const res = await window.doraland.installLocalAddon(currentAddonCategory);
    if (res?.canceled) return;
    if (res?.error) {
      showNotification(res.error, 'error');
      return;
    }
    if (res?.success) {
      await refreshUserAddonsAndCatalog();
      showNotification(`Se instalaron ${res.installed.length} archivo(s) correctamente.`, 'success');
    }
  });

  document.getElementById('btnOpenAddonFolder')?.addEventListener('click', () => {
    window.doraland.openAddonFolder(currentAddonCategory);
  });
}

async function refreshUserAddonsAndCatalog() {
  const res = await window.doraland.getUserAddons();
  if (res?.success) {
    userAddonsCache = {
      mods: res.mods || [],
      resourcepacks: res.resourcepacks || [],
      shaders: res.shaders || []
    };
  }
  renderUserInstalledAddons();
  const q = document.getElementById('addonSearchInput')?.value || '';
  await loadCatalogForCurrentCategory(q);
}

function getInstalledListByCategory(cat) {
  if (cat === 'mod') return userAddonsCache.mods || [];
  if (cat === 'resourcepack') return userAddonsCache.resourcepacks || [];
  return userAddonsCache.shaders || [];
}

function renderUserInstalledAddons() {
  const listEl = document.getElementById('userAddonsList');
  const titleEl = document.getElementById('installedAddonsTitle');
  if (!listEl) return;

  const items = getInstalledListByCategory(currentAddonCategory);
  const labelMap = {
    mod: 'Complementos Instalados',
    resourcepack: 'Resource Packs Instalados',
    shader: 'Shaders Instalados'
  };
  if (titleEl) {
    titleEl.innerHTML = `${getSvgIcon('box', 14)} Tus ${labelMap[currentAddonCategory] || 'Complementos'} (${items.length})`;
  }

  listEl.innerHTML = '';
  if (items.length === 0) {
    listEl.innerHTML = '<span class="empty-addon-note">No has instalado complementos adicionales en esta categoría todavía.</span>';
    return;
  }

  for (const item of items) {
    const pill = document.createElement('div');
    pill.className = 'user-addon-pill';
    pill.innerHTML = `
      <div class="uap-info">
        <span class="uap-title">${escapeHtml(item.title)}</span>
        <span class="uap-meta">${escapeHtml(item.fileName)} • ${item.sizeKb} KB</span>
      </div>
      <button class="uap-remove" title="Quitar complemento">${getSvgIcon('trash', 12)} Quitar</button>
    `;
    pill.querySelector('.uap-remove')?.addEventListener('click', async () => {
      const delRes = await window.doraland.removeUserAddon({
        category: currentAddonCategory,
        fileName: item.fileName
      });
      if (delRes?.success) {
        showNotification(`"${item.title}" eliminado.`, 'info');
        await refreshUserAddonsAndCatalog();
      } else {
        showNotification(delRes?.error || 'No se pudo eliminar', 'error');
      }
    });
    listEl.appendChild(pill);
  }
}

async function loadCatalogForCurrentCategory(query = '') {
  const grid = document.getElementById('catalogAddonsGrid');
  if (!grid) return;

  grid.innerHTML = '<span class="empty-addon-note">Cargando catálogo compatible...</span>';
  const res = await window.doraland.searchAddonsCatalog({
    category: currentAddonCategory,
    query
  });

  const items = res?.items || [];
  grid.innerHTML = '';

  if (items.length === 0) {
    grid.innerHTML = '<span class="empty-addon-note">No se encontraron complementos compatibles con esa búsqueda.</span>';
    return;
  }

  const installedList = getInstalledListByCategory(currentAddonCategory);

  for (const item of items) {
    const alreadyInstalled = installedList.some(inst =>
      inst.title.toLowerCase() === item.title.toLowerCase() ||
      inst.fileName.toLowerCase().includes(String(item.id || '').toLowerCase())
    );

    const card = document.createElement('div');
    card.className = 'addon-card';
    const iconHtml = item.iconUrl
      ? `<img src="${escapeHtml(item.iconUrl)}" alt="" />`
      : `<span>${getSvgIcon(item.iconType || 'box', 20)}</span>`;

    card.innerHTML = `
      <div class="ac-top">
        <div class="ac-icon">${iconHtml}</div>
        <div>
          <div class="ac-title">${escapeHtml(item.title)}</div>
          <div class="ac-author">por ${escapeHtml(item.author || 'Creador')}</div>
        </div>
      </div>
      <div class="ac-desc">${escapeHtml(item.description)}</div>
      <div class="ac-footer">
        <span class="ac-badge">${escapeHtml(item.badge || 'Compatible')}</span>
        <button class="ac-install-btn" ${alreadyInstalled ? 'disabled' : ''}>
          ${alreadyInstalled ? `${getSvgIcon('check', 12)} Instalado` : `${getSvgIcon('download', 12)} Instalar`}
        </button>
      </div>
    `;

    const btn = card.querySelector('.ac-install-btn');
    if (btn && !alreadyInstalled) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Instalando...';
        const dlRes = await window.doraland.installRemoteAddon({
          projectId: item.projectId,
          title: item.title,
          category: currentAddonCategory
        });
        if (dlRes?.success) {
          showNotification(`¡"${item.title}" instalado en tu cliente Web SMP!`, 'success');
          await refreshUserAddonsAndCatalog();
        } else {
          btn.disabled = false;
          btn.innerHTML = `${getSvgIcon('download', 12)} Instalar`;
          showNotification(dlRes?.error || 'Error al instalar', 'error');
        }
      });
    }

    grid.appendChild(card);
  }
}

// ── CHANGELOG (LAUNCHER + MODS AGREGADOS, ACTUALIZADOS Y RETIRADOS) ──
function setupChangelog() {
  document.querySelectorAll('.cl-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cl-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChangelogFilter = btn.dataset.clFilter || 'all';
      renderChangelogEntries();
    });
  });
}

async function loadAndRenderChangelog() {
  cachedChangelogData = await window.doraland.getChangelog();
  renderChangelogEntries();
}

function renderChangelogEntries() {
  const timeline = document.getElementById('changelogTimeline');
  const diffContainer = document.getElementById('autoModDiffContainer');
  if (!timeline) return;

  const entries = cachedChangelogData?.entries || [];
  const autoDiff = cachedChangelogData?.autoModDiff || null;

  if (diffContainer) {
    if (autoDiff && ((autoDiff.added?.length || 0) + (autoDiff.updated?.length || 0) + (autoDiff.removed?.length || 0) > 0)) {
      diffContainer.style.display = 'block';
      diffContainer.innerHTML = `
        <div class="cl-card" style="border-left-color: var(--green-bright); margin-bottom: 12px;">
          <div class="cl-header">
            <div class="cl-title-wrap">
              <span class="cl-ver-tag">AUTO-SYNC</span>
              <span class="cl-title">Última Sincronización Automática</span>
            </div>
            <span class="cl-date">${escapeHtml(autoDiff.date || '')}</span>
          </div>
          <div class="cl-groups">
            ${autoDiff.added?.length ? `<div class="cl-group-box"><div class="cl-group-title added">${getSvgIcon('plus', 13)} Contenido Agregado (${autoDiff.added.length})</div><ul class="cl-list">${autoDiff.added.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul></div>` : ''}
            ${autoDiff.updated?.length ? `<div class="cl-group-box"><div class="cl-group-title updated">${getSvgIcon('refresh', 13)} Contenido Actualizado (${autoDiff.updated.length})</div><ul class="cl-list">${autoDiff.updated.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul></div>` : ''}
            ${autoDiff.removed?.length ? `<div class="cl-group-box"><div class="cl-group-title removed">${getSvgIcon('minus', 13)} Contenido Retirado (${autoDiff.removed.length})</div><ul class="cl-list">${autoDiff.removed.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul></div>` : ''}
          </div>
        </div>
      `;
    } else {
      diffContainer.style.display = 'none';
    }
  }

  timeline.innerHTML = '';
  for (const entry of entries) {
    const showLauncher = currentChangelogFilter === 'all' || currentChangelogFilter === 'launcher';
    const showMods = currentChangelogFilter === 'all' || currentChangelogFilter === 'mods';

    const launcherList = showLauncher ? (entry.launcherChanges || []) : [];
    const addedList = showMods ? (entry.modsAdded || []) : [];
    const updatedList = showMods ? (entry.modsUpdated || []) : [];
    const removedList = showMods ? (entry.modsRemoved || []) : [];

    if (!launcherList.length && !addedList.length && !updatedList.length && !removedList.length) {
      continue;
    }

    const card = document.createElement('div');
    card.className = 'cl-card';
    card.innerHTML = `
      <div class="cl-header">
        <div class="cl-title-wrap">
          <span class="cl-ver-tag">ACTUALIZACIÓN</span>
          <span class="cl-title">${escapeHtml(entry.title || 'Actualización Web SMP')}</span>
        </div>
        <span class="cl-date">${getSvgIcon('calendar', 12)} ${escapeHtml(entry.date || '')}</span>
      </div>
      <div class="cl-summary">${escapeHtml(entry.summary || '')}</div>
      <div class="cl-groups">
        ${launcherList.length ? `
          <div class="cl-group-box">
            <div class="cl-group-title launcher">${getSvgIcon('rocket', 13)} Novedades del Launcher</div>
            <ul class="cl-list">${launcherList.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${addedList.length ? `
          <div class="cl-group-box">
            <div class="cl-group-title added">${getSvgIcon('plus', 13)} Contenido Agregado</div>
            <ul class="cl-list">${addedList.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${updatedList.length ? `
          <div class="cl-group-box">
            <div class="cl-group-title updated">${getSvgIcon('refresh', 13)} Contenido Actualizado</div>
            <ul class="cl-list">${updatedList.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${removedList.length ? `
          <div class="cl-group-box">
            <div class="cl-group-title removed">${getSvgIcon('minus', 13)} Contenido Retirado</div>
            <ul class="cl-list">${removedList.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          </div>
        ` : ''}
      </div>
    `;
    timeline.appendChild(card);
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── ESTADO DEL SERVIDOR ────────────────────────────────────────
async function checkServerStatus(ip, port) {
  const dot = document.getElementById('statusDot');
  const label = document.getElementById('statusLabel');
  const players = document.getElementById('statusPlayers');

  if (!ip) return;
  if (label) label.textContent = 'Verificando...';

  try {
    const url = `https://api.mcstatus.io/v2/status/java/${ip}${port && port !== 25565 ? ':' + port : ''}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (resp.ok) {
      const data = await resp.json();
      if (data.online) {
        dot?.setAttribute('class', 'status-dot online');
        if (label) label.textContent = 'Servidor En Línea';
        if (players) players.textContent = `${data.players?.online || 0} / ${data.players?.max || 0} jugadores activos`;
        return;
      }
    }
    throw new Error('offline');
  } catch {
    dot?.setAttribute('class', 'status-dot offline');
    if (label) label.textContent = 'Fuera de línea / Mantenimiento';
    if (players) players.textContent = 'Sin conexión con el servidor';
  }
}

// ── REDES SOCIALES ─────────────────────────────────────────────
function buildSocialLinks(ui) {
  const container = document.getElementById('socialLinks');
  if (!container || !ui) return;

  const links = [
    { key: 'discordUrl', label: 'Discord Oficial', icon: getSvgIcon('message', 13) },
    { key: 'websiteUrl', label: 'Sitio Web', icon: getSvgIcon('globe', 13) },
    { key: 'youtubeUrl', label: 'YouTube', icon: getSvgIcon('play', 13) }
  ];

  container.innerHTML = '';
  links.forEach(({ key, label, icon }) => {
    if (!ui[key]) return;
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'social-btn';
    a.innerHTML = `${icon} ${label}`;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.doraland.openExternal(ui[key]);
    });
    container.appendChild(a);
  });
}

// ── NOTIFICACIONES FLOTANTES EN PRIMER PLANO ───────────────────
function showNotification(msg, type = 'info') {
  const notif = document.createElement('div');
  const iconSvg = type === 'error'
    ? getSvgIcon('alert', 16)
    : type === 'success'
      ? getSvgIcon('check', 16)
      : getSvgIcon('info', 16);

  notif.style.cssText = `
    position: fixed; bottom: 22px; right: 22px; z-index: 20000;
    background: ${type === 'error' ? 'rgba(28, 10, 10, 0.97)' : 'rgba(10, 26, 15, 0.97)'};
    border: 1.5px solid ${type === 'error' ? '#EF4444' : 'var(--gold)'};
    color: ${type === 'error' ? '#FCA5A5' : 'var(--text-primary)'};
    padding: 12px 18px; border-radius: 10px;
    font-size: 12.5px; font-weight: 700;
    box-shadow: 0 12px 34px rgba(0,0,0,0.8);
    backdrop-filter: blur(14px);
    max-width: 360px; word-break: break-word;
    display: flex; align-items: center; gap: 10px;
  `;
  notif.innerHTML = `${iconSvg}<span>${escapeHtml(msg)}</span>`;
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transition = 'opacity 0.3s';
    setTimeout(() => notif.remove(), 300);
  }, 4000);
}

// ── AUTO-UPDATER DEL LAUNCHER (PRIMER PLANO CON BARRA DE PROGRESO) ──
function setupLauncherAutoUpdater() {
  const banner = document.getElementById('updateBanner');
  const ubTitle = document.getElementById('ubTitle');
  const ubDesc = document.getElementById('ubDesc');
  const ubBtn = document.getElementById('btnUpdateLauncher');
  const ubProgressBar = document.getElementById('ubProgressBar');

  if (!banner || !ubBtn) return;

  window.doraland.onLauncherUpdateAvailable((data) => {
    banner.style.display = 'flex';
    if (ubProgressBar) ubProgressBar.style.width = '12%';
    if (ubTitle) ubTitle.textContent = '¡Actualizando Web SMP Launcher!';
    if (ubDesc) ubDesc.textContent = data.releaseNotes || 'Aplicando la última actualización del launcher en segundo plano...';
    showNotification('Nueva actualización de Web SMP Launcher detectada. Descargando...', 'info');
    if (data.autoApplying) {
      ubBtn.disabled = true;
      ubBtn.textContent = 'Actualizando...';
    } else {
      ubBtn.disabled = false;
      ubBtn.textContent = 'Descargar';
      ubBtn.onclick = async () => {
        ubBtn.disabled = true;
        ubBtn.textContent = 'Descargando... (0%)';
        await window.doraland.downloadLauncherUpdate();
      };
    }
  });

  window.doraland.onLauncherUpdateProgress((data) => {
    banner.style.display = 'flex';
    const pct = Math.max(5, Math.min(100, Number(data.percent) || 0));
    if (ubProgressBar) ubProgressBar.style.width = `${pct}%`;
    if (ubBtn) ubBtn.textContent = `Actualizando... (${pct}%)`;
  });

  window.doraland.onLauncherUpdateDownloaded((data) => {
    banner.style.display = 'flex';
    if (ubProgressBar) ubProgressBar.style.width = '100%';
    if (ubTitle) ubTitle.textContent = '¡Web SMP Launcher actualizado!';
    if (ubDesc) ubDesc.textContent = data.autoRestart
      ? 'Reiniciando automáticamente en 2 segundos para aplicar los cambios...'
      : 'La nueva versión se descargó. Haz clic para reiniciar y aplicar.';
    showNotification('Actualización completada. Reiniciando el Launcher...', 'success');
    ubBtn.disabled = false;
    ubBtn.textContent = 'Reiniciar ahora';
    ubBtn.onclick = () => {
      window.doraland.installLauncherUpdate();
    };
  });
}

// ── UTILIDADES ─────────────────────────────────────────────────
function safeText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

document.addEventListener('DOMContentLoaded', init);
