@echo off
title Doraland Launcher
set ELECTRON_RUN_AS_NODE=
echo ==================================================
echo   Iniciando Launcher Oficial Doraland (Forge 1.21.1)
echo ==================================================
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0." --no-sandbox
