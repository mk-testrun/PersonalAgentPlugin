using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Tests;

public class ConcurrencyTests
{
    [Fact]
    public void Mutate_Serializes_Parallel_Read_Modify_Write()
    {
        var dir = Path.Combine(Path.GetTempPath(), "mkc-conc-" + Guid.NewGuid().ToString("n"));
        // 8 Threads × 50 Inkremente auf dieselbe Budget-Datei ⇒ ohne Lock gingen Updates verloren.
        Parallel.For(0, 8, _ =>
        {
            var budgets = new Budgets(new StateStore(dir));
            for (var i = 0; i < 50; i++) budgets.Increment("toolCalls");
        });
        var snapshot = new Budgets(new StateStore(dir)).Snapshot();
        Assert.Equal(400, snapshot["toolCalls"].Used); // 8 × 50, kein Lost Update
    }

    [Fact]
    public void Mutate_Applies_Update_Function()
    {
        var store = new StateStore(Path.Combine(Path.GetTempPath(), "mkc-mut-" + Guid.NewGuid().ToString("n")));
        store.Mutate<Counter>("c.json", cur => new Counter((cur?.N ?? 0) + 1));
        store.Mutate<Counter>("c.json", cur => new Counter((cur?.N ?? 0) + 1));
        Assert.Equal(2, store.ReadJson<Counter>("c.json")!.N);
    }

    private sealed record Counter(int N);
}
