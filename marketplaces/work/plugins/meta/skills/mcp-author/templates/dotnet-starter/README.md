# dotnet-mcpserver-starter

Lauffähiger Starter für eigene .NET-8-MCPs mit dem offiziellen `ModelContextProtocol` NuGet-Paket.

## Voraussetzungen

- .NET 8 SDK
- NuGet-Internetzugang (oder lokaler Feed) für `ModelContextProtocol 1.4.0`

## Build & Start

```bash
dotnet build
dotnet run
```

## Enthaltene Tools

| Tool | Beschreibung |
|---|---|
| `PasswordGenerate` | Kryptografisch sicheres Passwort |
| `NewGuid` | UUID v4 |
| `WorkItemBranchName` | ADO-Branch-Name `feature/AB-<id>-<slug>` |

## Als Template nutzen

```bash
# Offizieller Template-Pfad (optional):
dotnet new install ModelContextProtocol.Templates
dotnet new mcpserver -n MeinServer

# Oder diesen Ordner kopieren und anpassen.
```

## Wiring (`.mcp.json`)

```json
{
  "mcpServers": {
    "my-dotnet-mcp": {
      "command": "dotnet",
      "args": ["run", "--project", "/pfad/zu/McpServerStarter.csproj"]
    }
  }
}
```

> Dieser Starter wird **nicht** dauerhaft in ein Marketplace-`.mcp.json` verdrahtet.
> Das `blazor`-Plugin verweist auf ihn als Vorlage für eigene .NET-MCPs.

## Hinweis

- Logs gehen auf **stderr** (stdout = JSON-RPC-Protokoll-Wire)
- NuGet-Restore benötigt Netzwerkzugang beim ersten `dotnet build`
