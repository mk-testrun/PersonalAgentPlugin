$auditFile = ".copilot/state/audit.jsonl"
if (Test-Path $auditFile) {
  $cutoff = (Get-Date).AddDays(-90).ToString("yyyy-MM-ddTHH:mm:ssZ")
  $lines = Get-Content $auditFile | Where-Object { $_ -match '"ts"' }
  $kept = $lines | Where-Object { ($_ | ConvertFrom-Json).ts -ge $cutoff }
  $kept | Set-Content $auditFile
}
Add-Content $auditFile "{`"event`":`"sessionEnd`",`"ts`":`"$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ' -AsUTC)`"}"
