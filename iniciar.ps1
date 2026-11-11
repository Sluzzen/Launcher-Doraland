$env:ELECTRON_RUN_AS_NODE = $null
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Iniciando Launcher Oficial Doraland (Forge 1.21.1)" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green
Start-Process -FilePath "$PSScriptRoot\node_modules\electron\dist\electron.exe" -ArgumentList "$PSScriptRoot --no-sandbox" -WorkingDirectory $PSScriptRoot
