#!/usr/bin/env bash
# Nur ausführen wenn .csproj/.sln vorhanden
if find . -name "*.csproj" -o -name "*.sln" 2>/dev/null | grep -q .; then
  RESULT=$(dotnet list package --vulnerable 2>&1 || true)
  if echo "$RESULT" | grep -qi "vulnerable\|critical\|high"; then
    echo "⚠ VULN-SCAN: Verwundbare NuGet-Pakete gefunden:"
    echo "$RESULT"
  fi
fi
