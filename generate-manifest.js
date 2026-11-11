// generate-manifest.js
// Genera automáticamente mods-manifest.json escaneando la carpeta mods/
// Úsalo con: npm run manifest

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const modsDir = path.join(__dirname, 'mods');
const configFile = path.join(__dirname, 'launcher-config.json');

if (!fs.existsSync(modsDir)) {
  console.error('❌ La carpeta mods/ no existe.');
  process.exit(1);
}

const config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : {};
const files = fs.readdirSync(modsDir).filter(f => f.toLowerCase().endsWith('.jar'));

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
    url: `https://raw.githubusercontent.com/Sluzzen/Launcher-Doraland/main/mods/${encodeURIComponent(file)}`
  });
  console.log(`  ✔ [${(stat.size / 1024 / 1024).toFixed(2)} MB] ${file}`);
}

const manifest = {
  version: config.launcher?.version || '1.0.0',
  generatedAt: new Date().toISOString(),
  minecraft: {
    version: config.minecraft?.version || '1.21.1',
    forgeVersion: config.minecraft?.forgeVersion || '1.21.1-52.0.47'
  },
  server: {
    ip: config.server?.ip || 'doralandmc.holyhosting.club',
    port: config.server?.port || 25565
  },
  modsCount: modsList.length,
  mods: modsList
};

const outputPath = path.join(__dirname, 'mods-manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log(`\n✅ Manifiesto generado con éxito: ${outputPath}`);
console.log('📌 Sube este archivo (mods-manifest.json) y tus mods a tu GitHub o servidor.');

