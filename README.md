# 🏰 Doraland Launcher

Launcher oficial del servidor **Doraland** (Minecraft Forge 1.21.1).  
Soporta cuentas **Premium** (Microsoft) y **No Premium** (Offline).

---

## 📁 Estructura del Proyecto

```
launcher Doraland/
├── assets/
│   └── logo.png                ← Logo del launcher (ya incluido)
├── mods/                       ← 📦 COLOCA AQUÍ TODOS LOS MODS (.jar)
│   └── (tus mods de Forge aquí)
├── src/
│   ├── main.js                 ← Proceso principal Electron
│   ├── preload.js              ← Puente seguro IPC
│   └── renderer/
│       ├── index.html          ← Interfaz principal
│       ├── style.css           ← Estilos Doraland
│       └── app.js              ← Lógica de la UI
├── launcher-config.json        ← ⚙️ Configuración del servidor y del launcher
├── package.json
└── .gitignore
```

---

## ⚙️ Configuración (`launcher-config.json`)

Edita este archivo para personalizar el servidor:

```json
{
  "server": {
    "name": "Doraland",
    "ip": "doralandmc.holyhosting.club",    ← IP de tu servidor
    "port": 25565
  },
  "minecraft": {
    "version": "1.21.1",
    "forgeVersion": "1.21.1-52.0.47",       ← Versión exacta de Forge
    "recommendedRamMb": 4096,
    "minRamMb": 2048,
    "maxRamMb": 16384
  },
  "ui": {
    "discordUrl": "https://discord.gg/TU_SERVIDOR",   ← Opcional
    "websiteUrl": "",
    "youtubeUrl": ""
  }
}
```

---

## 📦 Gestión de Mods

Simplemente coloca los archivos `.jar` de tus mods dentro de la carpeta **`mods/`** en la raíz del proyecto.

El launcher automáticamente:
1. Detecta qué mods tiene cada usuario y cuáles faltan o están desactualizados.
2. Copia los mods desde la carpeta `mods/` del launcher a la carpeta de Minecraft del usuario.
3. Elimina mods viejos que ya no estén en la carpeta `mods/` (si `cleanOldMods: true`).

> Los usuarios **nunca** tienen que tocar la carpeta de mods manualmente.

---

## 🚀 Desarrollo y Prueba

Puedes iniciar el launcher de dos formas:

1. **Doble clic**: Ejecuta directamente el archivo `iniciar.bat`.
2. **Por terminal**:
```bash
# Ejecutar launcher
npm start

# Ejecutar con herramientas de desarrollo (DevTools)
npm run dev
```

---

## 🔄 Actualizaciones Automáticas

Este launcher cuenta con dos sistemas de actualización para que **no tengas que reenviar el ejecutable** a los jugadores cada vez que hagas cambios:

### 1. 📦 Actualización Remota de Mods (Sin reenviar el launcher)
1. Coloca o reemplaza tus mods en la carpeta `mods/`.
2. Ejecuta en terminal:
   ```bash
   npm run manifest
   ```
   Esto generará automáticamente el archivo `mods-manifest.json` con los hashes y tamaños.
3. Sube `mods-manifest.json` y la carpeta `mods/` a tu repositorio en GitHub o a tu hosting web.
4. En `launcher-config.json`, coloca el enlace directo a ese archivo:
   ```json
   "mods": {
     "enabled": true,
     "source": "auto",
     "remoteManifestUrl": "https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/main/mods-manifest.json",
     "cleanOldMods": true
   }
   ```
5. **Listo**: Cada vez que agregues o borres un mod en tu GitHub, tus jugadores abrirán su launcher y se les sincronizará automáticamente.

---

### 2. 🚀 Actualización del Launcher (`electron-updater`)
Si cambias la interfaz, botones o código de Electron:
1. Sube de versión en `package.json` (ejemplo: `"version": "1.0.1"`).
2. Asegúrate de configurar tu repositorio en `package.json`:
   ```json
   "publish": [
     {
       "provider": "github",
       "owner": "TU_USUARIO_GITHUB",
       "repo": "TU_REPOSITORIO"
     }
   ]
   ```
3. Publica el Release en GitHub con los archivos generados en `dist/`.
4. El launcher de tus jugadores detectará la actualización solo, mostrará un aviso en verde y dorado, y les permitirá actualizar con un solo clic.

---

## 📦 Compilar para Distribución

```bash
# Generar instalador .exe + portable .exe
npm run build

# Solo portable .exe
npm run build:portable
```

Los archivos se generarán en la carpeta `dist/`.

---

## 🔧 Requisitos del Sistema (para Jugadores)

- **Windows** 10/11 (64-bit)
- **Java 21** (el launcher lo detecta automáticamente)
- **Conexión a Internet** (solo para cuentas Premium y primera instalación)
- Mínimo **4 GB de RAM** libre para el juego

---

## 📝 Notas para el Administrador

- Para **actualizar mods**: agrega/reemplaza los `.jar` en la carpeta `mods/`, haz commit y push al repositorio. Los usuarios que re-ejecuten el launcher recibirán los mods actualizados automáticamente.
- Para **cambiar la versión de Forge**: edita `forgeVersion` en `launcher-config.json`.
- El launcher guarda los datos del juego en `%USERPROFILE%\.doraland\` en la PC del jugador.

