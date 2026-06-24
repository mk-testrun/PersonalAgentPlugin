$input_data = $input | ConvertFrom-Json -ErrorAction SilentlyContinue
$toolArgs = ($input_data.toolArgs ?? $input_data.tool_args) | ConvertTo-Json -Compress
# Secret scan
if ($toolArgs -match '(?i)(password|secret|token|api[_-]?key|pat)\s*[=:]\s*[A-Za-z0-9+/]{20,}') {
  Write-Output '{"permissionDecision":"deny","permissionDecisionReason":"Secret-Scan: potential credential detected"}'
  exit 0
}
# Tool-guardian deny list
$denyList = @("rm -rf", "curl http://", "wget http://")
foreach ($pattern in $denyList) {
  if ($toolArgs -like "*$pattern*") {
    Write-Output "{`"permissionDecision`":`"deny`",`"permissionDecisionReason`":`"Tool-Guardian: blocked: $pattern`"}"
    exit 0
  }
}
Write-Output '{"permissionDecision":"allow","permissionDecisionReason":"OK"}'
