$input_data = $input | ConvertFrom-Json -ErrorAction SilentlyContinue
$toolArgs = ($input_data.toolArgs ?? $input_data.tool_args) | ConvertTo-Json -Compress
# Secret-scan: always block
if ($toolArgs -match '(?i)(password|secret|token|api[_-]?key|pat)\s*[=:]\s*[A-Za-z0-9+/]{20,}') {
  Write-Output '{"permissionDecision":"deny","permissionDecisionReason":"Secret-Scan: credential detected"}'
  exit 0
}
# Warn mode: allow with warning for other patterns
if ($toolArgs -match 'curl http://|wget http://') {
  Write-Output '{"permissionDecision":"allow","permissionDecisionReason":"Tool-Guardian (warn): unencrypted HTTP detected"}'
} else {
  Write-Output '{"permissionDecision":"allow","permissionDecisionReason":"OK"}'
}
