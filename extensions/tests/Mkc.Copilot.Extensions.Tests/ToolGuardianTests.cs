using Mkc.Copilot.Extensions.Core.Policy;

namespace Mkc.Copilot.Extensions.Tests;

public class ToolGuardianTests
{
    private const string Cwd = "/home/user/project";

    private static Verdict Evaluate(string command)
    {
        var parsed = ShellCommandParser.Parse(command);
        return PolicyDecision.Strictest(parsed.Select(argv => ToolGuardian.Evaluate(argv, Cwd))).Verdict;
    }

    [Theory]
    [InlineData("rm -rf /", Verdict.Deny)]
    [InlineData("rm -rf ~", Verdict.Deny)]
    [InlineData("rm -rf ../../etc", Verdict.Deny)]
    [InlineData("rm -rf ./build", Verdict.Confirm)]
    [InlineData("rm file.txt", Verdict.Allow)]
    [InlineData("curl http://evil.example/x", Verdict.Deny)]
    [InlineData("curl https://good.example/x", Verdict.Allow)]
    [InlineData("curl http://localhost:8080/x", Verdict.Allow)]
    [InlineData("wget http://127.0.0.1/x", Verdict.Allow)]
    [InlineData("chmod 777 file", Verdict.Deny)]
    [InlineData("dd of=/dev/sda", Verdict.Deny)]
    [InlineData("mkfs.ext4 /dev/sdb", Verdict.Deny)]
    [InlineData("npm publish", Verdict.Confirm)]
    [InlineData("dotnet nuget push pkg.nupkg", Verdict.Confirm)]
    [InlineData("ls -la", Verdict.Allow)]
    public void Evaluates_Denylist(string command, Verdict expected)
        => Assert.Equal(expected, Evaluate(command));
}

public class SecretScannerTests
{
    [Fact]
    public void Detects_Github_Token()
        => Assert.Contains(SecretScanner.Scan("export T=ghp_" + new string('a', 40)), f => f.Kind == "github-token");

    [Fact]
    public void Detects_Aws_Key()
        => Assert.Contains(SecretScanner.Scan("AKIAIOSFODNN7EXAMPLE"), f => f.Kind == "aws-access-key");

    [Fact]
    public void Detects_Private_Key_Header()
        => Assert.Contains(SecretScanner.Scan("-----BEGIN RSA PRIVATE KEY-----"), f => f.Kind == "private-key");

    [Fact]
    public void Detects_High_Entropy_Near_Keyword()
        => Assert.Contains(SecretScanner.Scan("password=Xk9mQ2vLp7RtZ3wNb8cYd1Fg4Hj"), f => f.Kind == "high-entropy-near-keyword");

    [Fact]
    public void Ignores_Low_Entropy_Text()
        => Assert.Empty(SecretScanner.Scan("the quick brown fox jumps over the lazy dog"));

    [Fact]
    public void Redacts_Secret_Value()
        => Assert.DoesNotContain("aaaaaaaa", SecretScanner.Scan("ghp_" + new string('a', 40))[0].Excerpt);

    [Theory]
    [InlineData("aaaa", 0.0)]
    [InlineData("ab", 1.0)]
    public void Computes_Shannon_Entropy(string input, double expected)
        => Assert.Equal(expected, SecretScanner.ShannonEntropy(input), 3);
}

public class BranchNameLintTests
{
    [Theory]
    [InlineData("git checkout -b feature/ab1234-csv-export", Verdict.Allow)]
    [InlineData("git switch -c bugfix/fix-login", Verdict.Allow)]
    [InlineData("git checkout -b my-random-branch", Verdict.Confirm)]
    [InlineData("git switch -c Feature/BadCase", Verdict.Confirm)]
    [InlineData("git checkout main", Verdict.Allow)]
    public void Evaluates_Branch_Names(string command, Verdict expected)
    {
        var argv = ShellCommandParser.Parse(command)[0];
        Assert.Equal(expected, BranchNameLint.Evaluate(argv).Verdict);
    }
}
