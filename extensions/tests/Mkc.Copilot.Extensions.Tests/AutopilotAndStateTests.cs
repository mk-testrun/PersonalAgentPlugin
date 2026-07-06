using Mkc.Copilot.Extensions.Core.Autopilot;
using Mkc.Copilot.Extensions.Core.Infrastructure;
using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Tests;

file sealed class FakeClock : IClock
{
    public DateTimeOffset UtcNow { get; set; } = new(2026, 7, 5, 12, 0, 0, TimeSpan.Zero);
}

public class ModeDetectorTests
{
    [Fact]
    public void Escalates_To_Suspected_Then_Autonomous()
    {
        var d = new ModeDetector();
        Assert.Equal(SessionMode.Interactive, d.Current);
        for (var i = 0; i < 3; i++) d.OnToolExecutionStart();
        Assert.Equal(SessionMode.Suspected, d.Current);
        for (var i = 0; i < 3; i++) d.OnToolExecutionStart();
        Assert.Equal(SessionMode.Autonomous, d.Current);
    }

    [Fact]
    public void UserMessage_Descends_One_Step()
    {
        var d = new ModeDetector();
        for (var i = 0; i < 6; i++) d.OnToolExecutionStart();
        Assert.Equal(SessionMode.Autonomous, d.Current);
        d.OnUserMessage();
        Assert.Equal(SessionMode.Suspected, d.Current);
    }

    [Fact]
    public void PermissionRequest_Resets_Counter()
    {
        var d = new ModeDetector();
        d.OnToolExecutionStart(); d.OnToolExecutionStart();
        d.OnPermissionRequest();
        d.OnToolExecutionStart(); d.OnToolExecutionStart();
        Assert.Equal(SessionMode.Interactive, d.Current);
    }

    [Fact]
    public void Authoritative_Overrides_Heuristic()
    {
        var d = new ModeDetector();
        d.SetAuthoritative(SessionMode.Autonomous);
        Assert.Equal(SessionMode.Autonomous, d.Current);
        d.OnUserMessage();
        Assert.Equal(SessionMode.Autonomous, d.Current); // bleibt autoritativ
        d.SetAuthoritative(null);
        Assert.Equal(SessionMode.Interactive, d.Current);
    }

    [Fact]
    public void Slow_Permission_Answer_Descends()
    {
        var d = new ModeDetector();
        for (var i = 0; i < 6; i++) d.OnToolExecutionStart();
        d.OnPermissionAnswered(TimeSpan.FromSeconds(3));
        Assert.Equal(SessionMode.Suspected, d.Current);
    }
}

public class ModeContractTests
{
    private static string TempDir()
    {
        var dir = Path.Combine(Path.GetTempPath(), "mkc-mode-" + Guid.NewGuid().ToString("n"));
        Directory.CreateDirectory(dir);
        return dir;
    }

    [Fact]
    public void Missing_File_Is_Unknown()
        => Assert.Equal(SessionMode.Unknown, new ModeContract(TempDir(), new FakeClock()).Read());

    [Fact]
    public void Roundtrips_Mode()
    {
        var clock = new FakeClock();
        var c = new ModeContract(TempDir(), clock);
        c.Write(SessionMode.Autonomous, "s1");
        Assert.Equal(SessionMode.Autonomous, c.Read());
    }

    [Fact]
    public void Stale_File_Fails_Strict_To_Autonomous()
    {
        var clock = new FakeClock();
        var c = new ModeContract(TempDir(), clock);
        c.Write(SessionMode.Interactive, "s1");
        clock.UtcNow = clock.UtcNow.AddSeconds(301); // TTL 300 s überschritten
        Assert.Equal(SessionMode.Autonomous, c.Read());
    }
}

public class BudgetsTests
{
    private static Budgets NewBudgets()
        => new(new StateStore(Path.Combine(Path.GetTempPath(), "mkc-bud-" + Guid.NewGuid().ToString("n"))));

    [Fact]
    public void Increments_And_Detects_Exhaustion()
    {
        var b = NewBudgets();
        b.SetLimit("toolCalls", 2);
        Assert.False(b.Increment("toolCalls"));
        Assert.False(b.Increment("toolCalls"));
        Assert.True(b.Increment("toolCalls")); // 3 > 2
    }

    [Fact]
    public void Persists_Across_Instances()
    {
        var dir = Path.Combine(Path.GetTempPath(), "mkc-bud-" + Guid.NewGuid().ToString("n"));
        new Budgets(new StateStore(dir)).Increment("shell");
        var snapshot = new Budgets(new StateStore(dir)).Snapshot();
        Assert.Equal(1, snapshot["shell"].Used);
    }

    [Fact]
    public void Reset_Clears_Counters()
    {
        var b = NewBudgets();
        b.Increment("toolCalls");
        b.Reset();
        Assert.Equal(0, b.Snapshot()["toolCalls"].Used);
    }
}
