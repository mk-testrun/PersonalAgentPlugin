using Mkc.Copilot.Extensions.Core.Policy;

namespace Mkc.Copilot.Extensions.Tests;

public class ShellCommandParserTests
{
    [Fact]
    public void Parses_Simple_Command()
    {
        var result = ShellCommandParser.Parse("git status");
        Assert.Single(result);
        Assert.Equal(["git", "status"], result[0]);
    }

    [Fact]
    public void Splits_Chained_Commands()
    {
        var result = ShellCommandParser.Parse("true && git reset --hard HEAD~3; echo done | cat");
        Assert.Contains(result, argv => argv is ["git", "reset", "--hard", "HEAD~3"]);
        Assert.Contains(result, argv => argv[0] == "echo");
        Assert.Contains(result, argv => argv[0] == "cat");
    }

    [Fact]
    public void Recurses_Into_Sh_Dash_C()
    {
        var result = ShellCommandParser.Parse("sh -c \"git push -f origin main\"");
        Assert.Contains(result, argv => argv is ["git", "push", "-f", "origin", "main"]);
    }

    [Fact]
    public void Recurses_Into_Nested_Bash_C()
    {
        var result = ShellCommandParser.Parse("bash -c 'sh -c \"git clean -fdx\"'");
        Assert.Contains(result, argv => argv is ["git", "clean", "-fdx"]);
    }

    [Fact]
    public void Strips_Git_C_Path_Prefix()
    {
        var result = ShellCommandParser.Parse("git -C /tmp/x clean -fd");
        Assert.Contains(result, argv => argv is ["git", "clean", "-fd"]);
    }

    [Fact]
    public void Strips_Env_Assignments_And_Env_Command()
    {
        var result = ShellCommandParser.Parse("FOO=1 BAR=2 env GIT_DIR=/x git push --force origin main");
        Assert.Contains(result, argv => argv[0] == "git" && argv.Contains("--force"));
    }

    [Fact]
    public void Extracts_Command_Substitution()
    {
        var result = ShellCommandParser.Parse("echo $(git branch -D feature/x)");
        Assert.Contains(result, argv => argv is ["git", "branch", "-D", "feature/x"]);
    }

    [Fact]
    public void Extracts_Backtick_Substitution()
    {
        var result = ShellCommandParser.Parse("echo `git reflog delete HEAD@{1}`");
        Assert.Contains(result, argv => argv[0] == "git" && argv[1] == "reflog");
    }

    [Fact]
    public void Respects_Quotes_For_Operators()
    {
        var result = ShellCommandParser.Parse("echo \"a && b\"");
        Assert.Single(result);
        Assert.Equal("a && b", result[0][1]);
    }

    [Fact]
    public void Resolves_Absolute_Command_Paths()
    {
        var result = ShellCommandParser.Parse("/usr/bin/git push --force origin main");
        Assert.Equal("git", result[0][0]);
    }
}
