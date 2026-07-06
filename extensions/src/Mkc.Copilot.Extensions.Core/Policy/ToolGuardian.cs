namespace Mkc.Copilot.Extensions.Core.Policy;

/// <summary>
/// Nicht-git-Denylist als Code: destruktive Datei-/System-Operationen und unsichere Transporte.
/// </summary>
public static class ToolGuardian
{
    public static PolicyDecision Evaluate(string[] argv, string cwd)
    {
        if (argv.Length == 0) return PolicyDecision.Allow;
        var cmd = argv[0];
        var rest = argv[1..];

        switch (cmd)
        {
            case "rm":
            {
                var recursive = HasShortFlag(rest, 'r') || HasShortFlag(rest, 'R') || rest.Contains("--recursive");
                var force = HasShortFlag(rest, 'f') || rest.Contains("--force");
                if (!(recursive && force)) return PolicyDecision.Allow;
                var targets = rest.Where(a => !a.StartsWith('-')).ToArray();
                if (targets.Any(t => IsOutsideCwd(t, cwd)))
                    return PolicyDecision.Deny("rm-rf-outside", "rm -rf außerhalb des Arbeitsverzeichnisses ist gesperrt.");
                return PolicyDecision.Confirm("rm-rf-inside", "rm -rf im Projekt — unwiderruflich.");
            }
            case "curl" or "wget":
            {
                var url = rest.FirstOrDefault(a => a.StartsWith("http://", StringComparison.OrdinalIgnoreCase));
                if (url is not null && !url.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase)
                                    && !url.StartsWith("http://127.0.0.1", StringComparison.OrdinalIgnoreCase))
                    return PolicyDecision.Deny("insecure-http", "Nur https (oder localhost) — http:// ist gesperrt.");
                return PolicyDecision.Allow;
            }
            case "chmod" when rest.Contains("777") || rest.Contains("-R") && rest.Contains("777"):
                return PolicyDecision.Deny("chmod-777", "chmod 777 ist gesperrt.");
            case "dd" when rest.Any(a => a.StartsWith("of=/dev/", StringComparison.Ordinal)):
                return PolicyDecision.Deny("dd-device", "dd auf Gerätedateien ist gesperrt.");
            case var _ when cmd.StartsWith("mkfs", StringComparison.Ordinal):
                return PolicyDecision.Deny("mkfs", "Dateisystem-Formatierung ist gesperrt.");
            case "npm" when rest.Length > 0 && rest[0] == "publish":
            case "dotnet" when rest.Length > 1 && rest[0] == "nuget" && rest[1] == "push":
                return PolicyDecision.Confirm("package-publish", "Paket-Veröffentlichung — nur nach Bestätigung.");
            default:
                return PolicyDecision.Allow;
        }
    }

    private static bool HasShortFlag(string[] args, char flag) =>
        args.Any(a => a.Length > 1 && a[0] == '-' && a[1] != '-' && a.Contains(flag));

    private static bool IsOutsideCwd(string target, string cwd)
    {
        if (target is "/" or "~" || target.StartsWith("~/", StringComparison.Ordinal)) return true;
        if (!Path.IsPathRooted(target)) return target.Split('/', '\\').Count(p => p == "..") >= 2;
        var full = Path.GetFullPath(target);
        var root = Path.GetFullPath(string.IsNullOrEmpty(cwd) ? "." : cwd);
        return !full.StartsWith(root, StringComparison.Ordinal);
    }
}
