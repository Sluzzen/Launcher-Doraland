/* ============================================================
   APP.JS — Lógica del Renderer (Doraland Launcher)
   ============================================================ */

// ── ESTADO GLOBAL ─────────────────────────────────────────────
let currentSession = null;
let config = null;
let isLaunching = false;
let consoleOpen = false;

// ── INICIALIZACIÓN ────────────────────────────────────────────
async function init() {
  config = await window.doraland.getConfig();
  currentSession = await window.doraland.getSession();
  const settings = await window.doraland.getSettings();

  applyConfig(config);
  applySettings(settings);
  setupTitlebarButtons();
  setupAuthTabs();
  setupRamSlider(settings.ram, config);
  setupConsole();
  setupLaunchEvents();
  setupLauncherAutoUpdater();

  if (currentSession) {
    showHomeScreen();
  } else {
    showLoginScreen();
  }
}

// ── APLICAR CONFIGURACIÓN ──────────────────────────────────────
function applyConfig(cfg) {
  if (!cfg) return;

  // Versión del launcher y del juego
  safeText('launcherVersion', `v${cfg.launcher?.version || '1.0.0'}`);
  safeText('mcVersion', cfg.minecraft?.version || '1.21.1');
  safeText('serverIp', cfg.server?.ip || '');
  safeText('playServerIp', cfg.server?.ip || '');
  safeText('wbServerIp', cfg.server?.ip || '');
  safeText('wbForgeVersion', cfg.minecraft?.forgeVersion || '1.21.1');

  // Redes sociales
  buildSocialLinks(cfg.ui);

  // Verificar estado del servidor (ping básico)
  checkServerStatus(cfg.server?.ip, cfg.server?.port);
}

function applySettings(settings) {
  const slider = document.getElementById('ramSlider');
  const closeToggle = document.getElementById('closeOnLaunch');
  if (slider) {
    slider.value = settings.ram || 4096;
    updateRamDisplay(settings.ram || 4096);
  }
  if (closeToggle) closeToggle.checked = settings.closeOnLaunch || false;
}

// ── CONTROLES DE VENTANA ───────────────────────────────────────
function setupTitlebarButtons() {
  document.getElementById('btnMinimize')?.addEventListener('click', () => window.doraland.minimize());
  document.getElementById('btnClose')?.addEventListener('click', () => window.doraland.close());
}

// ── TABS DE AUTENTICACIÓN ──────────────────────────────────────
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

  // Botones de autenticación
  document.getElementById('btnMicrosoft')?.addEventListener('click', loginMicrosoft);
  document.getElementById('btnOfflineLogin')?.addEventListener('click', loginOffline);

  // Enter en el campo de nickname
  document.getElementById('inputNickname')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginOffline();
  });

  // Validación en tiempo real del nickname
  document.getElementById('inputNickname')?.addEventListener('input', (e) => {
    validateNickname(e.target.value, false);
  });

  // Botón de logout
  document.getElementById('btnLogout')?.addEventListener('click', logout);
}

// ── LOGIN MICROSOFT (PREMIUM) ──────────────────────────────────
async function loginMicrosoft() {
  const btn = document.getElementById('btnMicrosoft');
  const loading = document.getElementById('premiumLoading');
  const loadingText = document.getElementById('premiumLoadingText');

  btn.disabled = true;
  loading.classList.add('show');
  loadingText.textContent = 'Abriendo Microsoft...';

  try {
    // Escuchar actualizaciones del flujo OAuth
    window.doraland.onAuthUpdate((update) => {
      if (update?.title) loadingText.textContent = update.title;
    });

    const result = await window.doraland.authMicrosoft();

    if (result && result.error) {
      showNotification('❌ ' + result.error, 'error');
      return;
    }

    if (result && result.session) {
      currentSession = result.session;
      showHomeScreen();
      showNotification('✅ ¡Sesión iniciada con Microsoft!', 'success');
    }
  } catch (err) {
    console.error('Error login Microsoft:', err);
    showNotification('❌ Error: ' + (err.message || 'Error de conexión con Microsoft'), 'error');
  } finally {
    btn.disabled = false;
    loading.classList.remove('show');
    window.doraland.removeAllListeners('auth-update');
  }
}

// ── LOGIN OFFLINE (NO PREMIUM) ─────────────────────────────────
async function loginOffline() {
  const input = document.getElementById('inputNickname');
  const username = input?.value?.trim() || '';

  if (!validateNickname(username, true)) return;

  const btn = document.getElementById('btnOfflineLogin');
  btn.disabled = true;
  btn.textContent = 'Conectando...';

  try {
    const result = await window.doraland.authOffline(username);

    if (result && result.error) {
      document.getElementById('nicknameError').textContent = result.error;
      return;
    }

    if (result && result.session) {
      currentSession = result.session;
      showHomeScreen();
      showNotification('✅ ¡Entraste como ' + username + '!', 'success');
    } else {
      document.getElementById('nicknameError').textContent = 'No se pudo obtener la sesión.';
    }
  } catch (err) {
    console.error('Error al iniciar sesión offline:', err);
    document.getElementById('nicknameError').textContent = 'Error: ' + (err.message || 'Error de conexión');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Continuar como No Premium';
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
    if (showErrors) errorEl.textContent = 'Solo letras, números y _ (guión bajo).';
    return false;
  }
  errorEl.textContent = '';
  return true;
}

// ── CERRAR SESIÓN ──────────────────────────────────────────────
async function logout() {
  await window.doraland.clearSession();
  currentSession = null;
  showLoginScreen();
}

// ── PANTALLAS ──────────────────────────────────────────────────
function showLoginScreen() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screenLogin')?.classList.add('active');
  updateUserCard(null);
}

function showHomeScreen() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screenHome')?.classList.add('active');
  updateUserCard(currentSession);

  // Nombre en el banner de bienvenida
  const name = currentSession?.name || 'Jugador';
  safeText('wbUsername', name);

  // Configurar botón play
  setupPlayButton();
}

// ── CARD DE USUARIO ────────────────────────────────────────────
function updateUserCard(session) {
  const nameEl = document.getElementById('userName');
  const typeEl = document.getElementById('userType');
  const avatarEl = document.getElementById('userAvatar');
  const logoutBtn = document.getElementById('btnLogout');

  if (!session) {
    if (nameEl) nameEl.textContent = 'Sin sesión';
    if (typeEl) typeEl.textContent = '';
    if (avatarEl) avatarEl.src = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
    return;
  }

  if (nameEl) nameEl.textContent = session.name || 'Jugador';
  if (logoutBtn) logoutBtn.style.display = 'flex';

  // Determinar tipo de cuenta
  const isPremium = session.meta?.type === 'msa';
  if (typeEl) {
    typeEl.textContent = isPremium ? '⭐ Premium' : '👤 No Premium';
    typeEl.style.color = isPremium ? 'var(--gold)' : 'var(--text-muted)';
  }

  // Avatar de Minecraft
  if (avatarEl && session.name) {
    avatarEl.src = `https://mc-heads.net/avatar/${session.name}/36`;
    avatarEl.onerror = () => {
      avatarEl.src = 'https://mc-heads.net/avatar/Steve/36';
    };
  }
}

// ── RAM SLIDER ─────────────────────────────────────────────────
async function setupRamSlider(currentRam, cfg) {
  const slider = document.getElementById('ramSlider');
  if (!slider) return;

  let safeMax = cfg?.minecraft?.maxRamMb || 16384;
  try {
    const sys = await window.doraland.getSystemInfo();
    if (sys && sys.safeMaxRamMb) {
      safeMax = Math.min(safeMax, sys.safeMaxRamMb);
    }
  } catch {}

  const min = cfg?.minecraft?.minRamMb || 2048;
  slider.min = min;
  slider.max = safeMax;
  slider.value = Math.min(safeMax, Math.max(min, currentRam));

  updateRamDisplay(slider.value);
  updateSliderFill(slider);

  slider.addEventListener('input', async () => {
    const val = parseInt(slider.value);
    updateRamDisplay(val);
    updateSliderFill(slider);
    await window.doraland.saveSettings({
      ram: val,
      closeOnLaunch: document.getElementById('closeOnLaunch')?.checked || false
    });
  });

  document.getElementById('closeOnLaunch')?.addEventListener('change', async (e) => {
    await window.doraland.saveSettings({
      ram: parseInt(slider.value),
      closeOnLaunch: e.target.checked
    });
  });
}

function updateRamDisplay(mb) {
  const gb = (mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1);
  safeText('ramValue', `${gb} GB`);
}

function updateSliderFill(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty('--pct', `${pct}%`);
}

// ── BOTÓN JUGAR ────────────────────────────────────────────────
function setupPlayButton() {
  const btn = document.getElementById('btnPlay');
  if (!btn) return;
  btn.onclick = null;
  btn.addEventListener('click', startGame);
}

async function startGame() {
  if (isLaunching) return;

  if (!currentSession) {
    showNotification('⚠️ Por favor inicia sesión primero.', 'error');
    showLoginScreen();
    return;
  }

  isLaunching = true;
  setPlayButtonState('launching');

  const ram = parseInt(document.getElementById('ramSlider')?.value || '4096');

  logToConsole('🚀 Iniciando proceso de juego para Doraland...', 'info');
  logToConsole(`📂 RAM solicitada: ${(ram/1024).toFixed(1)} GB`, 'info');

  showProgressSection(true);
  updateProgress(0, 'Verificando entorno...');

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

// ── EVENTOS DEL LANZADOR ───────────────────────────────────────
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
      updateProgress(100, '¡Minecraft Forge 1.21.1 iniciado!');
      logToConsole('✅ ¡Minecraft Forge 1.21.1 iniciado correctamente!', 'info');
    } else if (data.status === 'error') {
      isLaunching = false;
      setPlayButtonState('ready');
      showProgressSection(false);
      showNotification('❌ ' + data.message, 'error');
      logToConsole('❌ ERROR: ' + data.message, 'error');

      if (data.message && data.message.includes('Java 21')) {
        logToConsole('🔗 Descarga Java 21 oficial aquí: https://adoptium.net/temurin/releases/?version=21', 'warn');
      }
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
    launching: { text: '⚙️ Iniciando...', disabled: true },
    running:   { text: '🎮 Jugando en Doraland...', disabled: true }
  };

  const s = states[state] || states.ready;
  btn.disabled = s.disabled;
  btn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>${s.text}`;
  if (state === 'running') btn.innerHTML = s.text;
}

// ── PROGRESO ───────────────────────────────────────────────────
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

function logToConsole(msg, type = 'debug') {
  const output = document.getElementById('consoleOutput');
  if (!output) return;

  const line = document.createElement('span');
  line.className = `console-line ${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;

  // Límite de líneas para evitar memory leak
  const lines = output.querySelectorAll('.console-line');
  if (lines.length > 500) lines[0].remove();
}

// ── VERIFICACIÓN DE SERVIDOR ────────────────────────────────────
async function checkServerStatus(ip, port) {
  const dot = document.getElementById('statusDot');
  const label = document.getElementById('statusLabel');
  const players = document.getElementById('statusPlayers');
  const serverIpEl = document.getElementById('serverIp');

  if (serverIpEl) serverIpEl.textContent = ip || '';
  if (!ip) {
    dot?.setAttribute('class', 'status-dot offline');
    if (label) label.textContent = 'Sin configurar';
    return;
  }

  if (label) label.textContent = 'Verificando...';

  // Usamos la API pública de Minecraft server para verificación
  try {
    const url = `https://api.mcstatus.io/v2/status/java/${ip}${port && port !== 25565 ? ':' + port : ''}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (resp.ok) {
      const data = await resp.json();
      if (data.online) {
        dot?.setAttribute('class', 'status-dot online');
        if (label) label.textContent = 'En línea';
        if (players) players.textContent = `${data.players?.online || 0} / ${data.players?.max || 0} jugadores`;
      } else {
        throw new Error('offline');
      }
    } else { throw new Error('no-response'); }
  } catch {
    dot?.setAttribute('class', 'status-dot offline');
    if (label) label.textContent = 'Sin conexión';
    if (players) players.textContent = 'No verificado';
  }
}

// ── REDES SOCIALES ─────────────────────────────────────────────
function buildSocialLinks(ui) {
  const container = document.getElementById('socialLinks');
  if (!container || !ui) return;

  const links = [
    { key: 'discordUrl', label: 'Discord', class: 'discord', icon: '💬' },
    { key: 'websiteUrl', label: 'Web', class: '', icon: '🌐' },
    { key: 'youtubeUrl', label: 'YouTube', class: '', icon: '▶️' }
  ];

  container.innerHTML = '';
  links.forEach(({ key, label, class: cls, icon }) => {
    if (!ui[key]) return;
    const a = document.createElement('a');
    a.href = '#';
    a.className = `social-btn ${cls}`;
    a.innerHTML = `${icon} ${label}`;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.doraland.openExternal(ui[key]);
    });
    container.appendChild(a);
  });
}

// ── NOTIFICACIONES ─────────────────────────────────────────────
function showNotification(msg, type = 'info') {
  // Crear notificación flotante
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 9999;
    background: ${type === 'error' ? '#1a0a0a' : '#0A1A0D'};
    border: 1px solid ${type === 'error' ? '#EF4444' : 'var(--green-bright)'};
    color: ${type === 'error' ? '#FCA5A5' : 'var(--text-primary)'};
    padding: 12px 18px; border-radius: 8px;
    font-size: 13px; font-weight: 600;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    animation: slideIn 0.3s ease;
    max-width: 320px; word-break: break-word;
  `;
  notif.textContent = msg;
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transition = 'opacity 0.3s';
    setTimeout(() => notif.remove(), 300);
  }, 4000);
}

// ── UTILIDADES ─────────────────────────────────────────────────
function safeText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// Animación de entrada del logo
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
`;
document.head.appendChild(style);

// ── AUTO-UPDATER DEL LAUNCHER ─────────────────────────────────
function setupLauncherAutoUpdater() {
  const banner = document.getElementById('updateBanner');
  const ubTitle = document.getElementById('ubTitle');
  const ubDesc = document.getElementById('ubDesc');
  const ubBtn = document.getElementById('btnUpdateLauncher');

  if (!banner || !ubBtn) return;

  window.doraland.onLauncherUpdateAvailable((data) => {
    banner.style.display = 'flex';
    if (ubTitle) ubTitle.textContent = `¡Nueva versión disponible: v${data.version}!`;
    if (ubDesc) ubDesc.textContent = 'Hay mejoras del launcher listas para instalar.';
    ubBtn.textContent = 'Descargar';
    ubBtn.onclick = async () => {
      ubBtn.disabled = true;
      ubBtn.textContent = 'Descargando... (0%)';
      await window.doraland.downloadLauncherUpdate();
    };
  });

  window.doraland.onLauncherUpdateProgress((data) => {
    if (ubBtn) ubBtn.textContent = `Descargando... (${data.percent}%)`;
  });

  window.doraland.onLauncherUpdateDownloaded((data) => {
    banner.style.display = 'flex';
    if (ubTitle) ubTitle.textContent = 'Actualización descargada';
    if (ubDesc) ubDesc.textContent = 'La nueva versión se descargó. Haz clic para reiniciar y aplicar.';
    ubBtn.disabled = false;
    ubBtn.textContent = 'Reiniciar launcher';
    ubBtn.onclick = () => {
      window.doraland.installLauncherUpdate();
    };
  });
}

// ── ARRANQUE ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

