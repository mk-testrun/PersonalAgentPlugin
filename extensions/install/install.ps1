# User-Scope-Installer (Windows, Ausführungsplan §2). Junction im Link-Modus (kein Admin nötig).
param(
  [ValidateSet("link", "copy")] [string]$Mode = "copy",
  [string]$Only = "",
  [switch]$WithRecorder
)
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path "$PSScriptRoot/..").Path
$Default = @("mkc-work-guardian", "mkc-work-sentinel", "mkc-work-flow")
if ($WithRecorder) { $Default += "mkc-work-recorder" }
$Exts = if ($Only) { $Only -split "[, ]+" } else { $Default }
$TargetRoot = Join-Path $HOME ".copilot/extensions"
New-Item -ItemType Directory -Force -Path $TargetRoot | Out-Null

function To-Pascal($name) {
  ($name -replace "^mkc-work-", "") -replace "(^|-)(.)", { $_.Groups[2].Value.ToUpper() }
}

foreach ($e in $Exts) {
  $proj = "Mkc.Copilot.Extensions.$(To-Pascal $e)"
  Write-Host ">> publish $proj"
  dotnet publish "$Root/src/$proj" -c Release -o "$Root/host/$e/bin" --nologo -v q
  $target = Join-Path $TargetRoot $e
  if (Test-Path $target) { Remove-Item -Recurse -Force $target }
  if ($Mode -eq "link") {
    New-Item -ItemType Junction -Path $target -Target "$Root/host/$e" | Out-Null
  } else {
    Copy-Item -Recurse "$Root/host/$e" $target
    Copy-Item "$Root/host/lib/bridge.mjs" (Join-Path $target "bridge.mjs") -Force
  }
  Write-Host "   installiert: $e ($Mode)"
}
Write-Host "Fertig. In der CLI: /extensions list"
