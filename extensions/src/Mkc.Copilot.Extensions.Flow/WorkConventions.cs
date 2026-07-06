using System.Text.RegularExpressions;
using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Flow;

/// <summary>
/// Deterministische SystemMessage-Section + Branch→Ticket-Ableitung + Projekttyp-Erkennung.
/// </summary>
public static partial class WorkConventions
{
    [GeneratedRegex(@"(?:^|/)(?:ab|AB)[-_]?(\d{2,7})")]
    private static partial Regex AbInBranch();

    public const string SystemMessageSection =
        "## mkc-work-Konventionen\n" +
        "- Commits: Conventional Commits (feat/fix/docs/test/refactor/chore), Betreff imperativ, ≤ 72 Zeichen.\n" +
        "- Branches: git-flow — feature/ab1234-kebab, bugfix/…, release/…, spike/… .\n" +
        "- Azure DevOps: WorkItem via AB#-Referenz im Commit-Footer verlinken.\n" +
        "- [CONFIRM] = vor destruktivem/veröffentlichendem Schritt Rückfrage; [GATE] = harter Stopp bei critical/high.\n" +
        "- PII (Namen/Mail/Telefon) wird lokal pseudonymisiert; IBAN/SteuerID werden redigiert.";

    public static string? ExtractAdoRef(string branch)
    {
        var m = AbInBranch().Match(branch);
        return m.Success ? $"AB#{m.Groups[1].Value}" : null;
    }

    public static async Task<string> ProjectContextAsync(string cwd, CancellationToken ct)
    {
        var branch = (await GitRunner.RunAsync(cwd, ["rev-parse", "--abbrev-ref", "HEAD"], ct)).StdOut;
        var parts = new List<string>();
        if (!string.IsNullOrEmpty(branch)) parts.Add($"Branch: {branch}");
        var ado = string.IsNullOrEmpty(branch) ? null : ExtractAdoRef(branch);
        if (ado is not null) parts.Add($"Ticket: {ado}");

        if (Directory.Exists(cwd))
        {
            var hasBlazor = Directory.EnumerateFiles(cwd, "*.csproj", SearchOption.AllDirectories).Take(50)
                .Any(f => File.ReadAllText(f).Contains("Microsoft.NET.Sdk.Web") || File.ReadAllText(f).Contains("Blazor"));
            var hasEf = Directory.EnumerateFiles(cwd, "*.csproj", SearchOption.AllDirectories).Take(50)
                .Any(f => File.ReadAllText(f).Contains("EntityFrameworkCore"));
            if (hasBlazor) parts.Add("Stack: Blazor/.NET");
            if (hasEf) parts.Add("EF Core erkannt");
        }
        return string.Join(" · ", parts);
    }
}
