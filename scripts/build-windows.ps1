$ErrorActionPreference = 'Stop'
$winlibs = ([Environment]::GetEnvironmentVariable('Path', 'User') -split ';' | Where-Object { $_ -match 'WinLibs' } | Select-Object -First 1)
if (-not $winlibs) {
  winget install --id BrechtSanders.WinLibs.POSIX.UCRT -e --scope user --silent --accept-package-agreements --accept-source-agreements
  $winlibs = ([Environment]::GetEnvironmentVariable('Path', 'User') -split ';' | Where-Object { $_ -match 'WinLibs' } | Select-Object -First 1)
}
$env:Path = "$winlibs;$env:Path"
& (Join-Path $env:USERPROFILE '.cargo\bin\rustup.exe') toolchain install stable-x86_64-pc-windows-gnu --profile minimal
$env:RUSTUP_TOOLCHAIN = 'stable-x86_64-pc-windows-gnu'
npx tauri build --target x86_64-pc-windows-gnu --bundles nsis
