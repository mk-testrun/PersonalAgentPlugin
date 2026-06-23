$input_data = $input | ConvertFrom-Json -ErrorAction SilentlyContinue
$toolName = $input_data.toolName ?? "unknown"
$auditFile = ".copilot/state/audit.jsonl"
New-Item -ItemType Directory -Force -Path (Split-Path $auditFile) | Out-Null
Add-Content $auditFile "{`"event`":`"postToolUse`",`"tool`":`"$toolName`",`"ts`":`"$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ' -AsUTC)`"}"
