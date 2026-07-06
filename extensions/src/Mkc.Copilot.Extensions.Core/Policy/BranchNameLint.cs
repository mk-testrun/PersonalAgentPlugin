using System.Text.RegularExpressions;

namespace Mkc.Copilot.Extensions.Core.Policy;

/// <summary>
/// git-flow-Branch-Schema (Hard-Coded-Annahme T2.1):
/// ^(feature|bugfix|hotfix|release|spike)/(ab\d+-)?[a-z0-9][a-z0-9-]{2,59}$
/// Greift bei `git checkout -b X` und `git switch -c X`; Verstoß ⇒ Confirm.
/// </summary>
public static partial class BranchNameLint
{
    [GeneratedRegex(@"^(feature|bugfix|hotfix|release|spike)/(ab\d+-)?[a-z0-9][a-z0-9-]{2,59}$")]
    private static partial Regex Schema();

    public static bool IsConform(string branchName) => Schema().IsMatch(branchName);

    public static PolicyDecision Evaluate(string[] argv)
    {
        var branch = ExtractNewBranch(argv);
        if (branch is null || IsConform(branch)) return PolicyDecision.Allow;
        return PolicyDecision.Confirm("branch-name-lint",
            $"Branch '{branch}' entspricht nicht dem git-flow-Schema (feature/ab1234-kebab-case).");
    }

    private static string? ExtractNewBranch(string[] argv)
    {
        if (argv.Length < 3 || argv[0] != "git") return null;
        var flag = argv[1] switch
        {
            "checkout" => "-b",
            "switch" => "-c",
            _ => null,
        };
        if (flag is null) return null;
        for (var i = 2; i < argv.Length - 1; i++)
            if (argv[i] == flag) return argv[i + 1];
        return null;
    }
}
