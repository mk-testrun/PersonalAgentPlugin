using Mkc.Copilot.Extensions.Core.Policy;
using Mkc.Copilot.Extensions.Core.State;
using Mkc.Copilot.Extensions.Core.Telemetry;

namespace Mkc.Copilot.Extensions.Tests;

public class WarnModeTests
{
    private static Verdict Eval(string command, PolicyMode mode)
    {
        var policy = new GitPolicy { Mode = mode };
        var parsed = ShellCommandParser.Parse(command);
        return PolicyDecision.Strictest(parsed.Select(a => GitGuardrails.Evaluate(a, policy))).Verdict;
    }

    [Theory]
    // Home/Warn: nicht-geschützte destruktive Ops werden zu Confirm herabgestuft …
    [InlineData("git reset --hard HEAD~3", Verdict.Confirm)]
    [InlineData("git clean -fdx", Verdict.Confirm)]              // im Block wäre das Deny
    [InlineData("git branch -D feature/x", Verdict.Confirm)]
    [InlineData("git push --force origin feature/x", Verdict.Confirm)]
    // … aber geschützte Branches bleiben IMMER hart:
    [InlineData("git push --force origin main", Verdict.Deny)]
    [InlineData("git push --force-with-lease origin main", Verdict.Deny)]
    public void Warn_Mode_Downgrades_Except_Protected(string command, Verdict expected)
        => Assert.Equal(expected, Eval(command, PolicyMode.Warn));

    [Theory]
    // Work/Block bleibt hart:
    [InlineData("git clean -fdx", Verdict.Deny)]
    [InlineData("git push --force origin feature/x", Verdict.Deny)]
    public void Block_Mode_Stays_Hard(string command, Verdict expected)
        => Assert.Equal(expected, Eval(command, PolicyMode.Block));
}

public class FleetAttributionTests
{
    private static UsageAggregator New()
        => new(new StateStore(Path.Combine(Path.GetTempPath(), "mkc-fleet-" + Guid.NewGuid().ToString("n"))), new PriceTable());

    [Fact]
    public void Breaks_Down_Cost_Per_Subagent_Via_Initiator()
    {
        var agg = New();
        agg.Record("gpt-5", 1000, 0, 0, "wf1", false, realCost: 0.05, initiator: "reviewer");
        agg.Record("gpt-5", 2000, 0, 0, "wf1", false, realCost: 0.10, initiator: "reviewer");
        agg.Record("gpt-5", 500, 0, 0, "wf1", false, realCost: 0.02, initiator: "tester");

        var fleet = agg.FleetBreakdown();
        Assert.Equal(2, fleet.Count);
        var reviewer = fleet.Single(f => f.Initiator == "reviewer");
        Assert.Equal(2, reviewer.Calls);
        Assert.Equal(0.15, reviewer.Cost, 6);
    }

    [Fact]
    public void Ignores_Entries_Without_Initiator()
    {
        var agg = New();
        agg.Record("gpt-5", 1000, 0, 0, null, false);
        Assert.Empty(agg.FleetBreakdown());
    }
}

public class BudgetAdvisorTests
{
    [Fact]
    public void Suggests_ToolCalls_From_Usage_History()
    {
        var dir = Path.Combine(Path.GetTempPath(), "mkc-adv-" + Guid.NewGuid().ToString("n"));
        var store = new StateStore(dir);
        var usage = new UsageAggregator(store, new PriceTable());
        // 30 Calls „heute" simulieren
        for (var i = 0; i < 30; i++) usage.Record("gpt-5", 100, 100, 0, null, false);

        var suggestions = new BudgetAdvisor(store).Suggest(
            new Dictionary<string, (int, int)> { ["toolCalls"] = (0, 300) });

        Assert.Single(suggestions);
        Assert.Equal("toolCalls", suggestions[0].Key);
        Assert.True(suggestions[0].Suggested >= 30); // an beobachtetem Verbrauch orientiert
    }

    [Fact]
    public void No_Suggestions_Without_History()
    {
        var store = new StateStore(Path.Combine(Path.GetTempPath(), "mkc-adv-" + Guid.NewGuid().ToString("n")));
        Assert.Empty(new BudgetAdvisor(store).Suggest(new Dictionary<string, (int, int)> { ["toolCalls"] = (0, 300) }));
    }
}
