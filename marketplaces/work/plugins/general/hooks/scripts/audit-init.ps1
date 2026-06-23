$auditFile = ".copilot/state/audit.jsonl"
New-Item -ItemType Directory -Force -Path (Split-Path $auditFile) | Out-Null
Add-Content $auditFile "{`"event`":`"sessionStart`",`"ts`":`"$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ' -AsUTC)`"}"
