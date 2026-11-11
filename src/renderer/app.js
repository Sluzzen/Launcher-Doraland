/* ============================================================
   APP.JS — Lógica del Renderer (Doraland Launcher v1.0.1)
   Incluye:
   - Navegación Moderna + Pantalla de Ajustes (Resolución, Cuenta Premium, RAM/JVM)
   - Estudio de Skins para No Premium (Subida .PNG, Drag & Drop, Importación y Render en Canvas)
   - Monetización con Google Ads (AdSense + Servidor de Anuncios + Fallback Patrocinado)
   - Auto-actualizador Dual y Lanzador NeoForge 1.21.1
   ============================================================ */

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
  customJvmArgs: ''
};
let currentSkin = null; // { dataUrl, model: 'classic'|'slim', name }
let loadedSkinImage = null;
let isLaunching = false;
let consoleOpen = false;
let currentAddonCategory = 'mod'; // 'mod' | 'resourcepack' | 'shader'
let userAddonsCache = { mods: [], resourcepacks: [], shaders: [] };
let currentChangelogFilter = 'all';
let cachedChangelogData = null;

// ── INICIALIZACIÓN ────────────────────────────────────────────
async function init() {
  initAmbientFireflies();

  config = await window.doraland.getConfig();
  currentSession = await window.doraland.getSession();
  const savedSettings = await window.doraland.getSettings();
  currentSettings = { ...currentSettings, ...(savedSettings || {}) };
  currentSkin = await window.doraland.getSkin();

  applyConfig(config);
  applySettingsToUI(currentSettings);
  setupTitlebarAndNavigation();
  setupAuthTabs();
  setupRamAndSettingsControls();
  setupSkinStudio();
  setupAddonsCenter();
  setupChangelog();
  setupGoogleAds(config?.ads);
  setupConsole();
  setupLaunchEvents();
  setupLauncherAutoUpdater();

  await refreshSkinRenderer();

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
      const color = p.gold ? `rgba(252, 211, 77, ${p.alpha})` : `rgba(74, 222, 128, ${p.alpha})`;
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

  const mcVer = cfg.minecraft?.version || '1.21.1';
  const loaderName = cfg.activeLoader?.name || 'NeoForge';
  const loaderDisplay = cfg.activeLoader?.display || `${loaderName} ${mcVer}`;
  const ip = cfg.server?.ip || 'doralandmc.holyhosting.club';

  safeText('loaderBadge', `${loaderName} ${mcVer}`);
  safeText('playLoaderText', `${loaderName} ${mcVer}`);
  safeText('serverIp', ip);
  safeText('tbServerIp', ip);
  safeText('playServerIp', ip);
  safeText('wbServerIp', ip);
  safeText('wbForgeVersion', `${loaderDisplay} • MC ${mcVer}`);

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
    const ip = config?.server?.ip || 'doralandmc.holyhosting.club';
    navigator.clipboard?.writeText(ip);
    showNotification(`📋 IP copiada: ${ip}`, 'success');
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

  if (screenId === 'screenHome') {
    safeText('wbUsername', currentSession?.name || 'Jugador');
    setupPlayButton();
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

  document.getElementById('btnLoginPickSkin')?.addEventListener('click', async () => {
    await pickCustomSkinFile();
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
      showNotification('❌ ' + result.error, 'error');
      return;
    }

    if (result && result.session) {
      currentSession = result.session;
      await refreshSkinRenderer();
      showScreen('screenHome');
      showNotification(`✅ ¡Conectado como ${currentSession.name} (Premium Microsoft)!`, 'success');
    }
  } catch (err) {
    showNotification('❌ Error: ' + (err.message || 'Error de conexión con Microsoft'), 'error');
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
      showNotification(`✅ ¡Bienvenido a Doraland, ${username}!`, 'success');
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
  showScreen('screenLogin');
}

// ── TARJETA DE USUARIO Y ESTADO DE CUENTA EN AJUSTES ──────────
function updateUserCard(session) {
  const nameEl = document.getElementById('userName');
  const typeEl = document.getElementById('userType');
  const logoutBtn = document.getElementById('btnLogout');

  if (!session) {
    if (nameEl) nameEl.textContent = 'Sin sesión';
    if (typeEl) {
      typeEl.textContent = 'Inicia sesión';
      typeEl.style.color = 'var(--text-muted)';
    }
    if (logoutBtn) logoutBtn.style.display = 'none';
    return;
  }

  if (nameEl) nameEl.textContent = session.name || 'Jugador';
  if (logoutBtn) logoutBtn.style.display = 'flex';

  const isPremium = session.meta?.type === 'msa';
  if (typeEl) {
    typeEl.textContent = isPremium ? '⭐ Cuenta Premium' : '👤 No Premium';
    typeEl.style.color = isPremium ? 'var(--gold-light)' : 'var(--green-neon)';
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
    typeEl.textContent = isPremium
      ? `⭐ Cuenta Oficial Microsoft Premium • UUID: ${session.uuid?.slice(0, 12)}...`
      : '👤 Cuenta No Premium (Offline) • Puedes subir tu Skin .PNG o cambiar a Premium';
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

  // Sliders de RAM
  const homeSlider = document.getElementById('ramSlider');
  const setSlider = document.getElementById('settingsRamSlider');
  if (homeSlider) {
    homeSlider.value = ram;
    updateSliderFill(homeSlider);
  }
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
  const closeHome = document.getElementById('closeOnLaunch');
  const closeSet = document.getElementById('settingsCloseOnLaunch');
  const fullQuick = document.getElementById('quickFullscreen');
  const fullSet = document.getElementById('settingsFullscreen');
  const hideSet = document.getElementById('settingsHideOnLaunch');
  const autoConnSet = document.getElementById('settingsAutoConnect');
  const turboSet = document.getElementById('settingsTurboOptimize');
  const lowSpecSet = document.getElementById('settingsLowSpecUi');
  const jvmInput = document.getElementById('inputCustomJvm');

  if (closeHome) closeHome.checked = Boolean(s.closeOnLaunch);
  if (closeSet) closeSet.checked = Boolean(s.closeOnLaunch);
  if (fullQuick) fullQuick.checked = full;
  if (fullSet) fullSet.checked = full;
  if (hideSet) hideSet.checked = Boolean(s.hideOnLaunch);
  if (autoConnSet) autoConnSet.checked = s.autoConnect !== false;
  if (turboSet) turboSet.checked = s.turboOptimize !== false;
  if (lowSpecSet) lowSpecSet.checked = Boolean(s.lowSpecUi);
  if (jvmInput) jvmInput.value = s.customJvmArgs || '';

  updateResolutionBadges(resW, resH, full);
}

function updateResolutionBadges(w, h, full) {
  const label = full ? 'Pantalla Completa' : `${w}×${h}`;
  safeText('heroResBadge', label);
  safeText('playResText', label);
}

async function persistSettings(partial = {}) {
  currentSettings = { ...currentSettings, ...partial };
  applySettingsToUI(currentSettings);
  await window.doraland.saveSettings(currentSettings);
}

async function setupRamAndSettingsControls() {
  const homeSlider = document.getElementById('ramSlider');
  const setSlider = document.getElementById('settingsRamSlider');

  let safeMax = config?.minecraft?.maxRamMb || 16384;
  try {
    const sys = await window.doraland.getSystemInfo();
    if (sys && sys.safeMaxRamMb) {
      safeMax = Math.min(safeMax, sys.safeMaxRamMb);
    }
  } catch {}

  const min = config?.minecraft?.minRamMb || 2048;
  [homeSlider, setSlider].forEach(sl => {
    if (!sl) return;
    sl.min = min;
    sl.max = safeMax;
    sl.value = Math.min(safeMax, Math.max(min, currentSettings.ram || 6144));
    updateSliderFill(sl);
  });
  safeText('ramMaxLabel', `${Math.round(safeMax / 1024)} GB`);
  updateRamDisplay(currentSettings.ram || 6144);

  homeSlider?.addEventListener('input', () => {
    const val = parseInt(homeSlider.value);
    if (setSlider) { setSlider.value = val; updateSliderFill(setSlider); }
    updateRamDisplay(val);
    updateSliderFill(homeSlider);
  });
  homeSlider?.addEventListener('change', () => {
    persistSettings({ ram: parseInt(homeSlider.value) });
  });

  setSlider?.addEventListener('input', () => {
    const val = parseInt(setSlider.value);
    if (homeSlider) { homeSlider.value = val; updateSliderFill(homeSlider); }
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
    const w = Math.min(7680, Math.max(640, parseInt(inputW?.value) || 1280));
    const h = Math.min(4320, Math.max(480, parseInt(inputH?.value) || 720));
    persistSettings({ resolutionWidth: w, resolutionHeight: h });
  };
  inputW?.addEventListener('change', onManualResChange);
  inputH?.addEventListener('change', onManualResChange);

  // Toggles sincronizados
  document.getElementById('closeOnLaunch')?.addEventListener('change', (e) => {
    persistSettings({ closeOnLaunch: e.target.checked });
  });
  document.getElementById('settingsCloseOnLaunch')?.addEventListener('change', (e) => {
    persistSettings({ closeOnLaunch: e.target.checked });
  });
  document.getElementById('quickFullscreen')?.addEventListener('change', (e) => {
    persistSettings({ fullscreen: e.target.checked });
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
  document.getElementById('inputCustomJvm')?.addEventListener('change', (e) => {
    persistSettings({ customJvmArgs: e.target.value.trim() });
  });

  // Optimizar y liberar caché del launcher
  document.getElementById('btnSettingsOptimizeLauncher')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnSettingsOptimizeLauncher');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⚡ Optimizando...';
    }
    try {
      const res = await window.doraland.optimizeLauncher();
      if (res?.success) {
        showNotification(`⚡ ¡Launcher optimizado! Se liberaron ${res.freedMb} MB de caché y archivos temporales.`, 'success');
      } else {
        showNotification('❌ ' + (res?.error || 'Error al optimizar'), 'error');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚡ Optimizar y Liberar Caché del Launcher';
      }
    }
  });

  // Botones de cuenta en Ajustes (Premium Minecraft / Cambiar cuenta)
  document.getElementById('btnSettingsPremiumLogin')?.addEventListener('click', () => {
    loginMicrosoft();
  });

  document.getElementById('btnSettingsSwitchAccount')?.addEventListener('click', () => {
    showScreen('screenLogin');
  });

  document.getElementById('btnSettingsOpenFolder')?.addEventListener('click', () => {
    window.doraland.openGameFolder();
  });

  document.getElementById('btnSettingsCheckUpdate')?.addEventListener('click', async () => {
    showNotification('🔍 Verificando actualizaciones en GitHub...', 'info');
    const res = await window.doraland.checkLauncherUpdate();
    if (res && !res.updateAvailable) {
      showNotification('✅ Estás en la última versión del Launcher.', 'success');
    }
  });

  document.getElementById('btnSaveAllSettings')?.addEventListener('click', async () => {
    const w = Math.min(7680, Math.max(640, parseInt(inputW?.value) || 1280));
    const h = Math.min(4320, Math.max(480, parseInt(inputH?.value) || 720));
    const jvm = document.getElementById('inputCustomJvm')?.value?.trim() || '';
    await persistSettings({ resolutionWidth: w, resolutionHeight: h, customJvmArgs: jvm });
    showNotification('💾 ¡Ajustes guardados correctamente!', 'success');
  });
}

function updateRamDisplay(mb) {
  const gb = (mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1);
  safeText('settingsRamValue', `${gb} GB`);
  safeText('heroRamBadge', `RAM: ${gb} GB`);
}

function updateSliderFill(slider) {
  if (!slider) return;
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty('--pct', `${pct}%`);
}

// ── ESTUDIO DE SKINS (NO PREMIUM PNG + RENDER CANVAS) ─────────
function setupSkinStudio() {
  document.getElementById('btnStudioSelectFile')?.addEventListener('click', pickCustomSkinFile);
  document.getElementById('btnHomeUploadSkin')?.addEventListener('click', pickCustomSkinFile);

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

  // Toggle capa exterior 3D
  document.getElementById('skinShowOuterLayer')?.addEventListener('change', () => {
    renderAllSkinCanvases();
  });

  // Importar por Nickname
  document.getElementById('btnImportSkinNick')?.addEventListener('click', async () => {
    const input = document.getElementById('inputSkinNick');
    const nick = input?.value?.trim() || '';
    if (!nick) {
      showNotification('⚠️ Escribe un nickname de Minecraft primero.', 'error');
      return;
    }
    const btn = document.getElementById('btnImportSkinNick');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    try {
      const res = await window.doraland.importSkinByNick(nick);
      if (res?.error) {
        showNotification('❌ ' + res.error, 'error');
      } else if (res?.skin) {
        currentSkin = res.skin;
        await refreshSkinRenderer();
        showNotification(`🎨 ¡Skin de ${nick} importada y aplicada!`, 'success');
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Importar'; }
    }
  });

  // Restablecer skin
  document.getElementById('btnResetSkin')?.addEventListener('click', async () => {
    await window.doraland.resetSkin();
    currentSkin = null;
    loadedSkinImage = null;
    await refreshSkinRenderer();
    showNotification('🔄 Skin restablecida al modelo por defecto.', 'info');
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
        showNotification('⚠️ Por favor suelta un archivo en formato .PNG.', 'error');
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
          showNotification('❌ ' + res.error, 'error');
        } else if (res?.skin) {
          currentSkin = res.skin;
          await refreshSkinRenderer();
          showNotification(`✅ Skin "${file.name}" cargada y lista para jugar.`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });
  }
}

async function pickCustomSkinFile() {
  const res = await window.doraland.selectSkinFile();
  if (res?.canceled) return;
  if (res?.error) {
    showNotification('❌ ' + res.error, 'error');
    return;
  }
  if (res?.skin) {
    currentSkin = res.skin;
    await refreshSkinRenderer();
    showNotification(`🎨 ¡Skin "${currentSkin.name}" aplicada correctamente!`, 'success');
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

async function refreshSkinRenderer() {
  const model = currentSkin?.model || 'classic';
  document.getElementById('btnModelClassic')?.classList.toggle('active', model === 'classic');
  document.getElementById('btnModelSlim')?.classList.toggle('active', model === 'slim');

  if (currentSkin && currentSkin.dataUrl) {
    safeText('skinCurrentName', `Skin activa: ${currentSkin.name || 'Personalizada.png'}`);
    safeText('homeSkinBadge', 'Personalizada');
    safeText('homeSkinNameLabel', currentSkin.name || 'Skin personalizada activa');
    try {
      loadedSkinImage = await loadImageElement(currentSkin.dataUrl);
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
      renderAllSkinCanvases();
      return;
    } catch {}
  }

  loadedSkinImage = null;
  safeText('skinCurrentName', 'Skin por defecto (Explorador Doraland)');
  safeText('homeSkinBadge', 'Por defecto');
  safeText('homeSkinNameLabel', 'Explorador Doraland');
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

  if (homeCanvas) drawMinecraftCharacter(homeCanvas, loadedSkinImage, 'front', showOuter, slim);
  if (frontCanvas) drawMinecraftCharacter(frontCanvas, loadedSkinImage, 'front', showOuter, slim);
  if (backCanvas) drawMinecraftCharacter(backCanvas, loadedSkinImage, 'back', showOuter, slim);

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
    if (showOuter) {
      ctx.drawImage(skinImg, 40, 8, 8, 8, 0, 0, canvas.width, canvas.height);
    }
  } else {
    // Avatar pixelado estilo Doraland cuando está offline
    ctx.fillStyle = '#15803D';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#D29B6E';
    ctx.fillRect(4, 6, 30, 28);
    ctx.fillStyle = '#4A2E1B';
    ctx.fillRect(4, 4, 30, 9);
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(9, 17, 6, 5);
    ctx.fillRect(23, 17, 6, 5);
  }
}

function drawMinecraftCharacter(canvas, skinImg, view = 'front', showOuter = true, slim = false) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Escala en píxeles por unidad de modelo (modelo total: 16 unidades de ancho x 32 unidades de alto)
  const scale = Math.min(Math.floor(canvas.width / 18), Math.floor(canvas.height / 34));
  const ox = Math.floor((canvas.width - 16 * scale) / 2);
  const oy = Math.floor((canvas.height - 32 * scale) / 2);
  const armW = slim ? 3 : 4;
  const leftArmX = slim ? 1 : 0;
  const rightArmX = 12;

  if (!skinImg) {
    // Render estilizado por defecto (Explorador de Doraland) si no hay imagen cargada
    // Cabeza
    ctx.fillStyle = '#4A2E1B';
    ctx.fillRect(ox + 4 * scale, oy + 0 * scale, 8 * scale, 8 * scale);
    ctx.fillStyle = '#D8A074';
    ctx.fillRect(ox + 4 * scale, oy + (view === 'front' ? 2 : 5) * scale, 8 * scale, (view === 'front' ? 6 : 3) * scale);
    if (view === 'front') {
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(ox + 5 * scale, oy + 4 * scale, 2 * scale, 1 * scale);
      ctx.fillRect(ox + 9 * scale, oy + 4 * scale, 2 * scale, 1 * scale);
    }
    // Torso (Túnica verde/dorada Doraland)
    ctx.fillStyle = '#15803D';
    ctx.fillRect(ox + 4 * scale, oy + 8 * scale, 8 * scale, 12 * scale);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(ox + 4 * scale, oy + 17 * scale, 8 * scale, 2 * scale);
    // Brazos
    ctx.fillStyle = '#166534';
    ctx.fillRect(ox + leftArmX * scale, oy + 8 * scale, armW * scale, 9 * scale);
    ctx.fillRect(ox + rightArmX * scale, oy + 8 * scale, armW * scale, 9 * scale);
    ctx.fillStyle = '#D8A074';
    ctx.fillRect(ox + leftArmX * scale, oy + 17 * scale, armW * scale, 3 * scale);
    ctx.fillRect(ox + rightArmX * scale, oy + 17 * scale, armW * scale, 3 * scale);
    // Piernas
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(ox + 4 * scale, oy + 20 * scale, 4 * scale, 12 * scale);
    ctx.fillRect(ox + 8 * scale, oy + 20 * scale, 4 * scale, 12 * scale);
    return;
  }

  const isLegacy64x32 = skinImg.height === 32;

  const part = (sx, sy, sw, sh, dx, dy, dw = sw, dh = sh) => {
    ctx.drawImage(skinImg, sx, sy, sw, sh, ox + dx * scale, oy + dy * scale, dw * scale, dh * scale);
  };

  if (view === 'front') {
    // Cabeza base + Sombrero 3D
    part(8, 8, 8, 8, 4, 0);
    if (showOuter) part(40, 8, 8, 8, 3.75, -0.25, 8.5, 8.5);

    // Torso + Chaqueta
    part(20, 20, 8, 12, 4, 8);
    if (showOuter && !isLegacy64x32) part(20, 36, 8, 12, 3.85, 7.85, 8.3, 12.3);

    // Brazo Derecho (a la izquierda del visor)
    part(44, 20, armW, 12, leftArmX, 8);
    if (showOuter && !isLegacy64x32) part(44, 36, armW, 12, leftArmX - 0.15, 7.85, armW + 0.3, 12.3);

    // Brazo Izquierdo (a la derecha del visor)
    if (isLegacy64x32) {
      part(44, 20, armW, 12, rightArmX, 8);
    } else {
      part(36, 52, armW, 12, rightArmX, 8);
      if (showOuter) part(52, 52, armW, 12, rightArmX - 0.15, 7.85, armW + 0.3, 12.3);
    }

    // Pierna Derecha
    part(4, 20, 4, 12, 4, 20);
    if (showOuter && !isLegacy64x32) part(4, 36, 4, 12, 3.85, 19.85, 4.3, 12.3);

    // Pierna Izquierda
    if (isLegacy64x32) {
      part(4, 20, 4, 12, 8, 20);
    } else {
      part(20, 52, 4, 12, 8, 20);
      if (showOuter) part(4, 52, 4, 12, 7.85, 19.85, 4.3, 12.3);
    }
  } else {
    // VISTA TRASERA
    part(24, 8, 8, 8, 4, 0);
    if (showOuter) part(56, 8, 8, 8, 3.75, -0.25, 8.5, 8.5);

    part(32, 20, 8, 12, 4, 8);
    if (showOuter && !isLegacy64x32) part(32, 36, 8, 12, 3.85, 7.85, 8.3, 12.3);

    // Brazos traseros
    const rArmBackX = slim ? 51 : 52;
    const lArmBackX = slim ? 43 : 44;
    if (isLegacy64x32) {
      part(rArmBackX, 20, armW, 12, leftArmX, 8);
      part(rArmBackX, 20, armW, 12, rightArmX, 8);
    } else {
      part(lArmBackX, 52, armW, 12, leftArmX, 8);
      part(rArmBackX, 20, armW, 12, rightArmX, 8);
    }

    // Piernas traseras
    if (isLegacy64x32) {
      part(12, 20, 4, 12, 4, 20);
      part(12, 20, 4, 12, 8, 20);
    } else {
      part(28, 52, 4, 12, 4, 20);
      part(12, 20, 4, 12, 8, 20);
    }
  }
}

// ── MONETIZACIÓN CON GOOGLE ADS (ADSENSE + FALLBACK) ──────────
function setupGoogleAds(adsCfg) {
  const homeSlot = document.getElementById('adSlotHome');
  const sideSlot = document.getElementById('adSlotSidebar');

  if (adsCfg && adsCfg.enabled === false) {
    if (homeSlot) homeSlot.style.display = 'none';
    if (sideSlot) sideSlot.style.display = 'none';
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
  document.getElementById('adSidebarCta')?.addEventListener('click', openPromo);

  // Si el administrador configuró un Client ID real de Google AdSense (ca-pub-XXXX)
  const clientId = adsCfg?.clientId || '';
  const hasRealAdSense = clientId.startsWith('ca-pub-') && !clientId.includes('0000000000');

  if (hasRealAdSense) {
    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);

      const mountHome = document.getElementById('adHomeMount');
      if (mountHome && adsCfg?.slots?.homeHorizontal) {
        const ins = document.createElement('ins');
        ins.className = 'adsbygoogle';
        ins.style.display = 'block';
        ins.dataset.adClient = clientId;
        ins.dataset.adSlot = adsCfg.slots.homeHorizontal;
        ins.dataset.adFormat = 'horizontal';
        mountHome.prepend(ins);
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch {}
  }

  // Rotador de anuncios patrocinados al pulsar ↻
  const promos = [
    {
      title: promo.title || 'Comunidad Oficial Doraland • Eventos y Rangos',
      sub: promo.subtitle || 'Únete a nuestro Discord oficial para sorteos, soporte y novedades del servidor.',
      cta: promo.ctaText || 'Unirse al Discord',
      icon: '💎'
    },
    {
      title: 'Personaliza tu Personaje en Doraland',
      sub: 'Usa el Estudio de Skin integrado y más de 1,510 Emotes de Emotecraft en el servidor.',
      cta: 'Explorar Discord',
      icon: '✨'
    }
  ];
  let promoIdx = 0;
  document.getElementById('btnRefreshAds')?.addEventListener('click', () => {
    promoIdx = (promoIdx + 1) % promos.length;
    const p = promos[promoIdx];
    safeText('adHomeTitle', p.title);
    safeText('adHomeSubtitle', p.sub);
    safeText('adHomeCta', p.cta);
  });
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
    showNotification('⚠️ Inicia sesión primero para entrar al servidor.', 'error');
    showScreen('screenLogin');
    return;
  }

  isLaunching = true;
  setPlayButtonState('launching');

  const ram = parseInt(currentSettings.ram || 6144);
  logToConsole('🚀 Iniciando Doraland Launcher...', 'info');
  logToConsole(`📊 RAM: ${(ram / 1024).toFixed(1)} GB • Resolución: ${currentSettings.fullscreen ? 'Pantalla Completa' : `${currentSettings.resolutionWidth}x${currentSettings.resolutionHeight}`}`, 'info');

  showProgressSection(true);
  updateProgress(0, 'Verificando entorno y actualizaciones...');

  try {
    const result = await window.doraland.launchGame({ session: currentSession, ram });
    if (result && result.error) {
      isLaunching = false;
      setPlayButtonState('ready');
      showProgressSection(false);
      showNotification('❌ ' + result.error, 'error');
      logToConsole('❌ ERROR: ' + result.error, 'error');
    }
  } catch (err) {
    isLaunching = false;
    setPlayButtonState('ready');
    showProgressSection(false);
    showNotification('❌ ' + (err.message || 'Error inesperado al lanzar'), 'error');
    logToConsole('❌ ' + (err.message || 'Error inesperado al lanzar'), 'error');
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
    const loaderLabel = data.loader || config?.activeLoader?.display || 'NeoForge 1.21.1';
    if (data.status === 'launched') {
      setPlayButtonState('running');
      updateProgress(100, `¡Minecraft (${loaderLabel}) en ejecución!`);
      logToConsole(`✅ ¡Minecraft (${loaderLabel}) iniciado correctamente!`, 'info');
    } else if (data.status === 'error') {
      isLaunching = false;
      setPlayButtonState('ready');
      showProgressSection(false);
      showNotification('❌ ' + data.message, 'error');
      logToConsole('❌ ERROR: ' + data.message, 'error');
    }
  });

  window.doraland.onLaunchClose((code) => {
    isLaunching = false;
    setPlayButtonState('ready');
    showProgressSection(false);
    logToConsole(`🏁 Minecraft cerrado (código: ${code})`, 'info');
  });
}

function setPlayButtonState(state) {
  const btn = document.getElementById('btnPlay');
  if (!btn) return;

  const states = {
    ready:     { text: '¡JUGAR EN DORALAND!', disabled: false },
    launching: { text: '⚙️ PREPARANDO E INICIANDO...', disabled: true },
    running:   { text: '🎮 JUGANDO EN DORALAND...', disabled: true }
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

// ── CENTRO DE COMPLEMENTOS (MODS DE CLIENTE, RESOURCE PACKS, SHADERS) ──
function setupAddonsCenter() {
  document.querySelectorAll('.addon-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.addon-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentAddonCategory = tab.dataset.addonCat || 'mod';

      const localBtn = document.getElementById('btnInstallLocalAddon');
      if (localBtn) {
        localBtn.textContent = currentAddonCategory === 'mod'
          ? '📁 Instalar desde mi PC (.JAR)'
          : '📁 Instalar desde mi PC (.ZIP)';
      }

      const searchInput = document.getElementById('addonSearchInput');
      if (searchInput) {
        searchInput.placeholder = currentAddonCategory === 'mod'
          ? 'Buscar Mods de Cliente compatibles (NeoForge 1.21.1)...'
          : currentAddonCategory === 'resourcepack'
            ? 'Buscar Resource Packs compatibles (1.21.1)...'
            : 'Buscar Shaders compatibles (Iris / Oculus)...';
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
      showNotification('❌ ' + res.error, 'error');
      return;
    }
    if (res?.success) {
      await refreshUserAddonsAndCatalog();
      showNotification(`✅ Se instalaron ${res.installed.length} archivo(s) correctamente.`, 'success');
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
    mod: 'Mods de Cliente Instalados',
    resourcepack: 'Resource Packs Instalados',
    shader: 'Shaders Instalados'
  };
  if (titleEl) {
    titleEl.textContent = `📦 Tus ${labelMap[currentAddonCategory] || 'Complementos'} (${items.length})`;
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
      <button class="uap-remove" title="Quitar complemento">🗑️ Quitar</button>
    `;
    pill.querySelector('.uap-remove')?.addEventListener('click', async () => {
      const delRes = await window.doraland.removeUserAddon({
        category: currentAddonCategory,
        fileName: item.fileName
      });
      if (delRes?.success) {
        showNotification(`🗑️ "${item.title}" eliminado.`, 'info');
        await refreshUserAddonsAndCatalog();
      } else {
        showNotification('❌ ' + (delRes?.error || 'No se pudo eliminar'), 'error');
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
      : `<span>${item.icon || '🧩'}</span>`;

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
        <span class="ac-badge">${escapeHtml(item.badge || 'Compatible 1.21.1')}</span>
        <button class="ac-install-btn" ${alreadyInstalled ? 'disabled' : ''}>
          ${alreadyInstalled ? '✓ Instalado' : '⬇️ Instalar'}
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
          showNotification(`✅ ¡"${item.title}" instalado en tu cliente Doraland!`, 'success');
          await refreshUserAddonsAndCatalog();
        } else {
          btn.disabled = false;
          btn.textContent = '⬇️ Instalar';
          showNotification('❌ ' + (dlRes?.error || 'Error al instalar'), 'error');
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
              <span class="cl-title">Última Sincronización Automática del Modpack</span>
            </div>
            <span class="cl-date">${escapeHtml(autoDiff.date || '')}</span>
          </div>
          <div class="cl-groups">
            ${autoDiff.added?.length ? `<div class="cl-group-box"><div class="cl-group-title added">➕ Mods Agregados (${autoDiff.added.length})</div><ul class="cl-list">${autoDiff.added.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul></div>` : ''}
            ${autoDiff.updated?.length ? `<div class="cl-group-box"><div class="cl-group-title updated">🔄 Mods Actualizados (${autoDiff.updated.length})</div><ul class="cl-list">${autoDiff.updated.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul></div>` : ''}
            ${autoDiff.removed?.length ? `<div class="cl-group-box"><div class="cl-group-title removed">➖ Mods Retirados (${autoDiff.removed.length})</div><ul class="cl-list">${autoDiff.removed.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul></div>` : ''}
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
          <span class="cl-title">${escapeHtml(entry.title || 'Actualización Doraland')}</span>
        </div>
        <span class="cl-date">📅 ${escapeHtml(entry.date || '')}</span>
      </div>
      <div class="cl-summary">${escapeHtml(entry.summary || '')}</div>
      <div class="cl-groups">
        ${launcherList.length ? `
          <div class="cl-group-box">
            <div class="cl-group-title launcher">🚀 Novedades del Launcher</div>
            <ul class="cl-list">${launcherList.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${addedList.length ? `
          <div class="cl-group-box">
            <div class="cl-group-title added">➕ Mods Agregados</div>
            <ul class="cl-list">${addedList.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${updatedList.length ? `
          <div class="cl-group-box">
            <div class="cl-group-title updated">🔄 Mods Actualizados</div>
            <ul class="cl-list">${updatedList.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${removedList.length ? `
          <div class="cl-group-box">
            <div class="cl-group-title removed">➖ Mods Retirados</div>
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
  const tbDot = document.getElementById('tbStatusDot');
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
        if (tbDot) tbDot.style.background = 'var(--green-bright)';
        if (label) label.textContent = 'Servidor En Línea';
        if (players) players.textContent = `${data.players?.online || 0} / ${data.players?.max || 0} jugadores activos`;
        return;
      }
    }
    throw new Error('offline');
  } catch {
    dot?.setAttribute('class', 'status-dot offline');
    if (tbDot) tbDot.style.background = '#EF4444';
    if (label) label.textContent = 'Fuera de línea / Mantenimiento';
    if (players) players.textContent = ip;
  }
}

// ── REDES SOCIALES ─────────────────────────────────────────────
function buildSocialLinks(ui) {
  const container = document.getElementById('socialLinks');
  if (!container || !ui) return;

  const links = [
    { key: 'discordUrl', label: 'Discord Oficial', icon: '💬' },
    { key: 'websiteUrl', label: 'Sitio Web', icon: '🌐' },
    { key: 'youtubeUrl', label: 'YouTube', icon: '▶️' }
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

// ── NOTIFICACIONES FLOTANTES ───────────────────────────────────
function showNotification(msg, type = 'info') {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 9999;
    background: ${type === 'error' ? 'rgba(28, 10, 10, 0.95)' : 'rgba(10, 26, 15, 0.95)'};
    border: 1px solid ${type === 'error' ? '#EF4444' : 'var(--gold)'};
    color: ${type === 'error' ? '#FCA5A5' : 'var(--text-primary)'};
    padding: 12px 18px; border-radius: 10px;
    font-size: 12.5px; font-weight: 700;
    box-shadow: 0 8px 28px rgba(0,0,0,0.65);
    backdrop-filter: blur(12px);
    max-width: 340px; word-break: break-word;
  `;
  notif.textContent = msg;
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transition = 'opacity 0.3s';
    setTimeout(() => notif.remove(), 300);
  }, 3800);
}

// ── AUTO-UPDATER DEL LAUNCHER ─────────────────────────────────
function setupLauncherAutoUpdater() {
  const banner = document.getElementById('updateBanner');
  const ubTitle = document.getElementById('ubTitle');
  const ubDesc = document.getElementById('ubDesc');
  const ubBtn = document.getElementById('btnUpdateLauncher');

  if (!banner || !ubBtn) return;

  window.doraland.onLauncherUpdateAvailable((data) => {
    banner.style.display = 'flex';
    if (ubTitle) ubTitle.textContent = '¡Actualizando Doraland Launcher!';
    if (ubDesc) ubDesc.textContent = data.releaseNotes || 'Aplicando la última actualización del launcher automáticamente...';
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
    if (ubBtn) ubBtn.textContent = `Actualizando... (${data.percent}%)`;
  });

  window.doraland.onLauncherUpdateDownloaded((data) => {
    banner.style.display = 'flex';
    if (ubTitle) ubTitle.textContent = '¡Doraland Launcher actualizado!';
    if (ubDesc) ubDesc.textContent = data.autoRestart
      ? 'Reiniciando automáticamente en 2 segundos para aplicar los cambios...'
      : 'La nueva versión se descargó. Haz clic para reiniciar y aplicar.';
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
