using Mkc.Copilot.Extensions.Core.Policy;

namespace Mkc.Copilot.Extensions.Tests;

public class GitGuardrailsTests
{
    private static readonly GitPolicy Policy = new();

    private static Verdict Evaluate(string command)
    {
        var parsed = ShellCommandParser.Parse(command);
        return PolicyDecision.Strictest(parsed.Select(argv => GitGuardrails.Evaluate(argv, Policy))).Verdict;
    }

    [Theory]
    [InlineData("git push --force origin main", Verdict.Deny)]
    [InlineData("git push -f origin feature/x", Verdict.Deny)]
    [InlineData("git push --force-with-lease origin feature/ab12-x", Verdict.Allow)]
    [InlineData("git push --force-with-lease origin main", Verdict.Deny)]         // geschützter Branch
    [InlineData("git push --force-with-lease origin release/1.2", Verdict.Deny)]  // geschützter Prefix
    [InlineData("git push origin main", Verdict.Allow)]
    [InlineData("git push --delete origin main", Verdict.Deny)]
    [InlineData("sh -c \"git push -f origin main\"", Verdict.Deny)]               // Umgehung via Subshell
    [InlineData("true && git reset --hard HEAD~3", Verdict.Confirm)]
    [InlineData("git -C /tmp/x clean -fdx", Verdict.Deny)]
    [InlineData("git clean -n", Verdict.Allow)]
    [InlineData("git branch -D feature/x", Verdict.Deny)]
    [InlineData("git branch -d feature/x", Verdict.Allow)]
    [InlineData("git checkout -f main", Verdict.Confirm)]
    [InlineData("git switch --discard-changes main", Verdict.Confirm)]
    [InlineData("git rebase origin/main", Verdict.Deny)]
    [InlineData("git rebase feature/other", Verdict.Allow)]
    [InlineData("git filter-branch --all", Verdict.Deny)]
    [InlineData("git filter-repo --path x", Verdict.Deny)]
    [InlineData("git update-ref -d refs/heads/x", Verdict.Deny)]
    [InlineData("git reflog delete HEAD@{1}", Verdict.Deny)]
    [InlineData("git reflog expire --all", Verdict.Deny)]
    [InlineData("git stash drop", Verdict.Confirm)]
    [InlineData("git status", Verdict.Allow)]
    public void Evaluates_Adr0004_Rules(string command, Verdict expected)
        => Assert.Equal(expected, Evaluate(command));

    [Fact]
    public void Push_Refspec_Colon_Target_Is_Checked()
        => Assert.Equal(Verdict.Deny, Evaluate("git push --force-with-lease origin feature/x:main"));
}
