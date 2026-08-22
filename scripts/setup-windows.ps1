$ErrorActionPreference = 'Stop'

Write-Host 'Pensieve Windows build environment' -ForegroundColor Magenta

$cargo = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
if (-not (Test-Path -LiteralPath $cargo)) {
  winget install --id Rustlang.Rustup -e --silent --accept-package-agreements --accept-source-agreements
}
& (Join-Path $env:USERPROFILE '.cargo\bin\rustup.exe') default stable

$vswhere = 'C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe'
$installation = if (Test-Path -LiteralPath $vswhere) {
  & $vswhere -latest -products * -property installationPath
}
$linker = if ($installation) {
  Get-ChildItem -LiteralPath $installation -Recurse -Filter link.exe -ErrorAction SilentlyContinue | Select-Object -First 1
}

if (-not $linker) {
  $setup = 'C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe'
  if (-not (Test-Path -LiteralPath $setup)) {
    winget install --id Microsoft.VisualStudio.2022.BuildTools -e --accept-package-agreements --accept-source-agreements
    $installation = 'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools'
  }
  $arguments = @('modify', '--installPath', "`"$installation`"", '--add', 'Microsoft.VisualStudio.Workload.NativeDesktop', '--includeRecommended', '--passive', '--norestart')
  Start-Process -FilePath $setup -ArgumentList $arguments -Verb RunAs -Wait
}

Write-Host 'Environment ready. Run: npm run tauri dev' -ForegroundColor Green
