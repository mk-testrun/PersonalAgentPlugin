using Mkc.Copilot.Extensions.Core.State;
using Mkc.Copilot.Extensions.Core.Workflow.Meta;

namespace Mkc.Copilot.Extensions.Tests;

public class LoopRunnerTests
{
    private static LoopRunner New()
        => new(new StateStore(Path.Combine(Path.GetTempPath(), "mkc-loop-" + Guid.NewGuid().ToString("n"))));

    [Fact]
    public void Stops_When_Goal_Reached()
    {
        var loop = New();
        loop.Start(5);
        var d = loop.Decide(allGreen: true, "hash1", budgetExhausted: false);
        Assert.Equal(LoopVerdict.StopGoalReached, d.Verdict);
    }

    [Fact]
    public void Stops_On_No_Progress_Identical_Hash()
    {
        var loop = New();
        loop.Start(10);
        var first = loop.Decide(allGreen: false, "sameHash", budgetExhausted: false);
        Assert.Equal(LoopVerdict.Continue, first.Verdict);
        var second = loop.Decide(allGreen: false, "sameHash", budgetExhausted: false);
        Assert.Equal(LoopVerdict.StopNoProgress, second.Verdict);
    }

    [Fact]
    public void Continues_When_Hash_Changes()
    {
        var loop = New();
        loop.Start(10);
        loop.Decide(false, "h1", false);
        var d = loop.Decide(false, "h2", false);
        Assert.Equal(LoopVerdict.Continue, d.Verdict);
    }

    [Fact]
    public void Stops_At_Max_Iterations()
    {
        var loop = New();
        loop.Start(2);
        loop.Decide(false, "h1", false); // iter 1
        loop.Decide(false, "h2", false); // iter 2
        var d = loop.Decide(false, "h3", false); // iter 3 > max 2
        Assert.Equal(LoopVerdict.StopMaxIterations, d.Verdict);
    }

    [Fact]
    public void Stops_On_Budget()
    {
        var loop = New();
        loop.Start(5);
        var d = loop.Decide(false, "h1", budgetExhausted: true);
        Assert.Equal(LoopVerdict.StopBudget, d.Verdict);
    }

    [Fact]
    public void Inactive_Without_Start()
        => Assert.Equal(LoopVerdict.Inactive, New().Decide(false, "h", false).Verdict);
}

public class BatchRunnerTests
{
    private static BatchRunner New()
        => new(new StateStore(Path.Combine(Path.GetTempPath(), "mkc-batch-" + Guid.NewGuid().ToString("n"))));

    [Fact]
    public void Add_Run_Complete_Advances_Pointer()
    {
        var batch = New();
        batch.Add("Task A");
        batch.Add("Task B");
        batch.Start();
        Assert.Equal("Task A", batch.Current()!.Description);
        batch.Complete("ok", failed: false);
        Assert.Equal("Task B", batch.Current()!.Description);
    }

    [Fact]
    public void Resume_Continues_From_Pointer()
    {
        var dir = Path.Combine(Path.GetTempPath(), "mkc-batch-" + Guid.NewGuid().ToString("n"));
        var store = new StateStore(dir);
        var batch = new BatchRunner(store);
        batch.Add("A"); batch.Add("B");
        batch.Start();
        batch.Complete("done", false); // A fertig

        // Neue Instanz (Prozess-Neustart simuliert) resumt bei B
        var resumed = new BatchRunner(store);
        resumed.Start();
        Assert.Equal("B", resumed.Current()!.Description);
    }

    [Fact]
    public void Deactivates_When_All_Done()
    {
        var batch = New();
        batch.Add("only");
        batch.Start();
        batch.Complete("ok", false);
        Assert.Null(batch.Current());
    }
}

public class GoalTrackerTests
{
    [Fact]
    public async Task Evaluates_Checks_Via_Exit_Code()
    {
        var dir = Path.Combine(Path.GetTempPath(), "mkc-goal-" + Guid.NewGuid().ToString("n"));
        Directory.CreateDirectory(dir);
        var goals = new GoalTracker(new StateStore(Path.Combine(dir, "state")), dir);
        goals.Set("Ziel", [new GoalCheck("true", 0), new GoalCheck("false", 0)]);

        var results = await goals.EvaluateAsync(default);
        Assert.True(results[0].Passed);   // 'true' exit 0
        Assert.False(results[1].Passed);  // 'false' exit 1 != 0
        Assert.False(await goals.AllGreenAsync(default));
    }

    [Fact]
    public async Task AllGreen_When_Every_Check_Passes()
    {
        var dir = Path.Combine(Path.GetTempPath(), "mkc-goal-" + Guid.NewGuid().ToString("n"));
        Directory.CreateDirectory(dir);
        var goals = new GoalTracker(new StateStore(Path.Combine(dir, "state")), dir);
        goals.Set("Ziel", [new GoalCheck("true", 0)]);
        Assert.True(await goals.AllGreenAsync(default));
    }
}

public class ProgressHashTests
{
    [Fact]
    public void Same_Error_Pattern_Same_Hash_Despite_Line_Numbers()
    {
        var a = ProgressHash.Compute("Error at line 42: null ref 0xAB12", "1 file changed");
        var b = ProgressHash.Compute("Error at line 99: null ref 0xFF00", "1 file changed");
        Assert.Equal(a, b); // Zeilennummern/Adressen normalisiert
    }

    [Fact]
    public void Different_Errors_Different_Hash()
    {
        var a = ProgressHash.Compute("null reference", "x");
        var b = ProgressHash.Compute("index out of range", "x");
        Assert.NotEqual(a, b);
    }
}
