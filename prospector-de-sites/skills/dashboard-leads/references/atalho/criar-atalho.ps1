# Cria um atalho "Gestão VF" na Área de Trabalho apontando pro launcher sem console.
# Uso: rodar com a pasta conectada como working dir (ou dar duplo clique via criar-atalho.bat).
$ErrorActionPreference = "Stop"
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbs = Join-Path $pasta "Gestao-VF.vbs"
$ico = Join-Path $pasta "assets\gestao-vf.ico"
if (-not (Test-Path $ico)) { $ico = Join-Path $pasta "gestao-vf.ico" }  # fallback: mesma pasta
$desktop = [Environment]::GetFolderPath('Desktop')

$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut((Join-Path $desktop 'Gestão VF.lnk'))
$lnk.TargetPath = "$env:WINDIR\System32\wscript.exe"
$lnk.Arguments = '"' + $vbs + '"'
$lnk.WorkingDirectory = $pasta
$lnk.IconLocation = $ico + ",0"
$lnk.Description = "Abre o painel de gestão de clientes e renda (VF)"
$lnk.WindowStyle = 1
$lnk.Save()
Write-Host "Atalho criado na Area de Trabalho: Gestão VF.lnk -> $vbs"
