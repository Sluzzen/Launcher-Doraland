// generate-manifest.js
// Genera automáticamente mods-manifest.json escaneando la carpeta mods/ y overrides/
// Compatible con repositorios multirama (ej: https://github.com/Sluzzen/mods-launcher.git)
// Úsalo con: npm run manifest

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const modsDir = path.join(__dirname, 'mods');
const overridesDir = path.join(__dirname, 'overrides');
const configFile = path.join(__dirname, 'launcher-config.json');

if (!fs.existsSync(modsDir)) {
  fs.mkdirSync(modsDir, { recursive: true });
}

const config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : {};
const modsConfig = config.mods || {};

const githubOwner = modsConfig.githubOwner || 'Sluzzen';
const githubRepo = modsConfig.githubRepo || 'mods-launcher';
let branch = modsConfig.branch;
if (!branch) {
  const sName = (config.server?.name || '').trim().toLowerCase();
  branch = (sName === 'doraland' || !sName) ? 'main' : (config.server?.name || 'main').trim();
}

const rawBaseUrl = `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${encodeURIComponent(branch)}`;

const files = fs.readdirSync(modsDir).filter(f => f.toLowerCase().endsWith('.jar'));

console.log(`📦 Repositorio destino: https://github.com/${githubOwner}/${githubRepo} (Rama: ${branch})`);
console.log(`📦 Escaneando ${files.length} mods en la carpeta mods/...`);

const modsList = [];

for (const file of files) {
  const filePath = path.join(modsDir, file);
  const stat = fs.statSync(filePath);
  
  // Calcular SHA1 del mod para verificación de integridad
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha1').update(fileBuffer).digest('hex');

  modsList.push({
    name: file,
    size: stat.size,
    sha1: hash,
    url: `${rawBaseUrl}/mods/${encodeURIComponent(file)}`
  });
  console.log(`  ✔ [${(stat.size / 1024 / 1024).toFixed(2)} MB] ${file}`);
}

// Escaneo opcional de overrides (configuraciones, emotes, shaders, menus)
const overridesList = [];
if (fs.existsSync(overridesDir)) {
  function scanDir(dir, relPath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      const rel = relPath ? `${relPath}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        scanDir(full, rel);
      } else if (ent.isFile()) {
        const stat = fs.statSync(full);
        overridesList.push({
          path: rel.replace(/\\/g, '/'),
          size: stat.size,
          url: `${rawBaseUrl}/overrides/${rel.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')}`
        });
      }
    }
  }
  scanDir(overridesDir);
  console.log(`🎨 Escaneados ${overridesList.length} archivos de configuración/overrides.`);
}

const manifest = {
  version: config.launcher?.version || '1.0.8',
  generatedAt: new Date().toISOString(),
  server: {
    name: config.server?.name || 'Doraland',
    ip: config.server?.ip || 'doralandmc.holyhosting.club',
    port: config.server?.port || 25565
  },
  repository: {
    owner: githubOwner,
    repo: githubRepo,
    branch: branch,
    rawBaseUrl: rawBaseUrl
  },
  minecraft: {
    version: config.minecraft?.version || '1.21.1',
    loaders: config.minecraft?.loaders || { neoforge: '21.1.250' }
  },
  modsCount: modsList.length,
  overridesCount: overridesList.length,
  mods: modsList,
  overrides: overridesList
};

const outputPath = path.join(__dirname, 'mods-manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log(`\n✅ Manifiesto generado con éxito: ${outputPath}`);
console.log(`📌 Sube este archivo (mods-manifest.json), mods/ y overrides/ a la rama "${branch}" de https://github.com/${githubOwner}/${githubRepo}`);
