using Mkc.Copilot.Extensions.Core.Companions;

namespace Mkc.Copilot.Extensions.Tests;

public class CompanionTests
{
    private static CompanionRegistry New()
        => new(Path.Combine(Path.GetTempPath(), "mkc-comp-" + Guid.NewGuid().ToString("n"), "companions.json"));

    [Fact]
    public void Knows_The_Three_Companions_With_Correct_Kinds()
    {
        Assert.Equal(CompanionKind.Skill, CompanionRegistry.Find("caveman")!.Kind);
        Assert.Equal(CompanionKind.Skill, CompanionRegistry.Find("graphify")!.Kind);
        Assert.Equal(CompanionKind.Proxy, CompanionRegistry.Find("headroom")!.Kind);
    }

    [Fact]
    public void Enable_Disable_Persists_Preference()
    {
        var reg = New();
        Assert.False(reg.IsEnabled("caveman"));
        reg.SetEnabled("caveman", true);
        Assert.True(reg.IsEnabled("caveman"));
        reg.SetEnabled("caveman", false);
        Assert.False(reg.IsEnabled("caveman"));
    }

    [Fact]
    public void Detects_Skill_By_Directory()
    {
        var cwd = Path.Combine(Path.GetTempPath(), "mkc-comp-cwd-" + Guid.NewGuid().ToString("n"));
        Directory.CreateDirectory(Path.Combine(cwd, ".copilot", "skills", "graphify"));
        var reg = New();
        Assert.True(reg.Detect(CompanionRegistry.Find("graphify")!, cwd));
        Assert.False(reg.Detect(CompanionRegistry.Find("caveman")!, cwd));
    }

    [Fact]
    public void Detects_Proxy_By_Env()
    {
        var reg = New();
        var headroom = CompanionRegistry.Find("headroom")!;
        Environment.SetEnvironmentVariable("HEADROOM_PROXY", "http://localhost:7000");
        try { Assert.True(reg.Detect(headroom, Path.GetTempPath())); }
        finally { Environment.SetEnvironmentVariable("HEADROOM_PROXY", null); }
    }

    [Fact]
    public void Status_Reports_All_Three()
    {
        var reg = New();
        reg.SetEnabled("caveman", true);
        var status = reg.Status(Path.GetTempPath());
        Assert.Equal(3, status.Count);
        Assert.True(status.Single(s => s.Id == "caveman").Enabled);
        Assert.False(status.Single(s => s.Id == "headroom").Enabled);
    }
}
