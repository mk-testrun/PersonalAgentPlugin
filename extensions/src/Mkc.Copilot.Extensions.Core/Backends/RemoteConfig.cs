namespace Mkc.Copilot.Extensions.Core.Backends;

/// <summary>
/// Remote-Konfiguration (Ausführungsplan §T2.1). Werte aus ENV/Keychain — nie im State.
/// Fehlt ein Pflichtwert, meldet IsComplete false und /mode remote bleibt auf local.
/// </summary>
public sealed record RemoteConfig
{
    public string AdoOrgUrl { get; init; } = "https://dev.azure.com/mkrueer";
    public string AdoProject { get; init; } = "Playground";
    public string AdoRepo { get; init; } = "Playground";
    public string AdoApiVersion { get; init; } = "7.1";
    public string? AdoPat { get; init; }

    public string ConfluenceBaseUrl { get; init; } = "https://mkrueer.atlassian.net/wiki";
    public string ConfluenceSpace { get; init; } = "DEV";
    public string? ConfluenceUser { get; init; }
    public string? ConfluenceToken { get; init; }

    public bool AdoComplete => !string.IsNullOrEmpty(AdoPat);
    public bool ConfluenceComplete => !string.IsNullOrEmpty(ConfluenceUser) && !string.IsNullOrEmpty(ConfluenceToken);

    public static RemoteConfig FromEnvironment() => new()
    {
        AdoOrgUrl = Env("ADO_ORG_URL", "https://dev.azure.com/mkrueer"),
        AdoProject = Env("ADO_PROJECT", "Playground"),
        AdoRepo = Env("ADO_REPO", "Playground"),
        AdoPat = Environment.GetEnvironmentVariable("ADO_PAT"),
        ConfluenceBaseUrl = Env("CONFLUENCE_BASE_URL", "https://mkrueer.atlassian.net/wiki"),
        ConfluenceSpace = Env("CONFLUENCE_SPACE", "DEV"),
        ConfluenceUser = Environment.GetEnvironmentVariable("CONFLUENCE_USER"),
        ConfluenceToken = Environment.GetEnvironmentVariable("CONFLUENCE_TOKEN"),
    };

    private static string Env(string key, string fallback) =>
        Environment.GetEnvironmentVariable(key) is { Length: > 0 } v ? v : fallback;

    public string MissingReport()
    {
        var missing = new List<string>();
        if (!AdoComplete) missing.Add("ADO_PAT");
        if (!ConfluenceComplete)
        {
            if (string.IsNullOrEmpty(ConfluenceUser)) missing.Add("CONFLUENCE_USER");
            if (string.IsNullOrEmpty(ConfluenceToken)) missing.Add("CONFLUENCE_TOKEN");
        }
        return missing.Count == 0 ? "" : "Fehlende Secrets (via ${env:…}/Keychain setzen): " + string.Join(", ", missing);
    }
}
