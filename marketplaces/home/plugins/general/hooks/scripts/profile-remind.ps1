# sessionStart: NUR eine Erinnerung ans zuletzt aktive MCP-Profil (kein automatisches Umschalten —
# siehe profile-remind.sh für die Begründung).
$state = ".copilot/state/profile.json"
if (-not (Test-Path $state)) { exit 0 }
try {
  $s = Get-Content -Raw $state | ConvertFrom-Json
  if ($s.profile) {
    $applied = if ($s.appliedAt) { $s.appliedAt } else { "?" }
    Write-Output "Hinweis: zuletzt aktives MCP-Profil war `"$($s.profile)`" (seit $applied). Umschalten: profile-switch-Skill (`"/profile <name>`")."
  }
} catch { }
