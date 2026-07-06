using Mkc.Copilot.Extensions.Core.State;
using Mkc.Copilot.Extensions.Core.Telemetry;

namespace Mkc.Copilot.Extensions.Tests;

public class PriceTableTests
{
    [Fact]
    public void Computes_Known_Model_Cost_Exactly()
    {
        var table = new PriceTable();
        // gpt-5: in 0.010, out 0.030, cached 0.001 je 1k
        var (cost, estimated) = table.Cost("gpt-5", 1000, 1000, 1000);
        Assert.False(estimated);
        Assert.Equal(0.041, cost, 6); // 0.010 + 0.030 + 0.001
    }

    [Fact]
    public void Unknown_Model_Is_Estimated_Zero()
    {
        var (cost, estimated) = new PriceTable().Cost("mystery-model", 1000, 1000, 0);
        Assert.True(estimated);
        Assert.Equal(0, cost);
    }
}

public class UsageAggregatorTests
{
    private static UsageAggregator New()
        => new(new StateStore(Path.Combine(Path.GetTempPath(), "mkc-usage-" + Guid.NewGuid().ToString("n"))), new PriceTable());

    [Fact]
    public void Aggregates_Cost_Per_Model_On_The_Cent()
    {
        var agg = New();
        // 3 Calls gpt-5, 1 Call claude
        agg.Record("gpt-5", 1000, 1000, 0, "wf1", false);
        agg.Record("gpt-5", 2000, 0, 0, "wf1", false);
        agg.Record("claude-sonnet-4.5", 1000, 1000, 0, "wf1", false);

        var report = agg.Report();
        // gpt-5: (1000+2000)/1k*0.010 + 1000/1k*0.030 = 0.030 + 0.030 = 0.060
        // claude: 0.009 + 0.027 = 0.036
        Assert.Equal(0.096, report.TotalCost, 6);
        Assert.Equal(2, report.ByModel.Count);
        Assert.False(report.AnyEstimated);
    }

    [Fact]
    public void Filters_By_Workflow()
    {
        var agg = New();
        agg.Record("gpt-5", 1000, 0, 0, "wf1", false);
        agg.Record("gpt-5", 5000, 0, 0, "wf2", false);
        var wf1 = agg.Report("wf1");
        Assert.Equal(1000, wf1.TotalInput);
    }

    [Fact]
    public void Marks_Estimated_When_Model_Unknown()
    {
        var agg = New();
        agg.Record("unknown", 1000, 1000, 0, null, true);
        Assert.True(agg.Report().AnyEstimated);
    }
}
