$projects = Get-ChildItem -Recurse -Include "*.csproj","*.sln" | Select-Object -First 1
if ($projects) {
  $result = dotnet list package --vulnerable 2>&1
  if ($result -match "vulnerable|critical|high") {
    Write-Warning "VULN-SCAN: Verwundbare NuGet-Pakete gefunden:`n$result"
  }
}
