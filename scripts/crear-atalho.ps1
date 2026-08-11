# Cria o atalho "Tradutor Claude" na Área de Trabalho apontando para o app Electron.
$ErrorActionPreference = 'Stop'

$root = 'C:\Users\Work\Documents\Claude\claude-translator'
$exe  = Join-Path $root 'node_modules\electron\dist\electron.exe'
$desktop = [Environment]::GetFolderPath('Desktop')
$lnk  = Join-Path $desktop 'Tradutor Claude.lnk'

if (-not (Test-Path $exe)) { throw "Electron não encontrado em: $exe" }

$shell = New-Object -ComObject WScript.Shell
$s = $shell.CreateShortcut($lnk)
$s.TargetPath = $exe
$s.Arguments  = '"' + $root + '"'
$s.WorkingDirectory = $root
$s.IconLocation = "$exe,0"
$s.Description = 'Tradutor Claude (claude-translator)'
$s.Save()

Write-Host "Atalho criado: $lnk"
