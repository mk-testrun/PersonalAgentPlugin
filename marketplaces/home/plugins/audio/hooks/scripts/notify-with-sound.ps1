$input_data = $input | ConvertFrom-Json -ErrorAction SilentlyContinue
$duration = $input_data.duration ?? 0
$status = $input_data.status ?? "success"
if ($duration -ge 30) {
  if ($status -eq "success") {
    [console]::beep(880, 300)
  } elseif ($status -eq "error") {
    [console]::beep(440, 500)
  }
}
