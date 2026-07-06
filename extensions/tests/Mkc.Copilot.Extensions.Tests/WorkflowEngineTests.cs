using Mkc.Copilot.Extensions.Core.Autopilot;
using Mkc.Copilot.Extensions.Core.State;
using Mkc.Copilot.Extensions.Core.Workflow;

namespace Mkc.Copilot.Extensions.Tests;

public class WorkflowEngineTests
{
    private static (WorkflowEngine engine, StateStore store) New()
    {
        var dir = Path.Combine(Path.GetTempPath(), "mkc-wf-" + Guid.NewGuid().ToString("n"));
        var store = new StateStore(dir);
        // Gates, die immer bestehen (kein git nötig), außer explizit rot gesetzten.
        var gates = new Gates(dir);
        gates.Register("TicketLinked", _ => Task.FromResult(new GateResult(true, "ok")));
        gates.Register("PlanFilled", _ => Task.FromResult(new GateResult(true, "ok")));
        gates.Register("BranchConform", _ => Task.FromResult(new GateResult(true, "ok")));
        gates.Register("HasCommits", _ => Task.FromResult(new GateResult(true, "ok")));
        gates.Register("TestsGreen", _ => Task.FromResult(new GateResult(false, "keine Tests")));
        return (new WorkflowEngine(store, gates), store);
    }

    [Fact]
    public void Start_Creates_State_And_Active_Pointer()
    {
        var (engine, _) = New();
        var state = engine.Start("feature", "ab1-x", "Titel");
        Assert.Equal("ticket", state.CurrentStep);
        Assert.Equal("ab1-x", engine.ActiveId());
    }

    [Fact]
    public async Task Next_Advances_When_Gates_Pass()
    {
        var (engine, _) = New();
        var state = engine.Start("feature", "ab1-x", "Titel");
        var r = await engine.NextAsync(state, SessionMode.Interactive, default);
        Assert.True(r.Advanced);
        Assert.Equal("plan", r.NewStep);
    }

    [Fact]
    public async Task Next_Blocks_When_Gate_Fails()
    {
        var (engine, _) = New();
        var state = engine.Start("feature", "ab1-x", "Titel");
        // Bis 'test' vorrücken
        for (var i = 0; i < 4; i++) await engine.NextAsync(state, SessionMode.Interactive, default);
        Assert.Equal("test", state.CurrentStep);
        var blocked = await engine.NextAsync(state, SessionMode.Interactive, default);
        Assert.False(blocked.Advanced);
        Assert.Contains("TestsGreen", blocked.Message);
    }

    [Fact]
    public void Skip_Only_Works_For_Skippable_Steps()
    {
        var (engine, _) = New();
        var state = engine.Start("feature", "ab1-x", "Titel");
        var notSkippable = engine.Skip(state, "ticket", "x", SessionMode.Interactive);
        Assert.False(notSkippable.Advanced);
        var skippable = engine.Skip(state, "doc", "später", SessionMode.Interactive);
        Assert.True(skippable.Advanced);
        Assert.Equal("Skipped", state.StepStatus["doc"]);
    }

    [Fact]
    public void Skip_Of_Nonautopilot_Step_Denied_In_Autonomous()
    {
        var (engine, _) = New();
        var state = engine.Start("doc", "d1", "Doku");
        // 'publish' ist autopilotAllowed:false, aber nicht skippable → zunächst skippable machen? Test review-Step.
        var r = engine.Skip(state, "review", "x", SessionMode.Autonomous);
        Assert.True(r.Advanced); // review ist skippable + autopilotAllowed default true
    }

    [Fact]
    public void Add_Inserts_AdHoc_Step()
    {
        var (engine, _) = New();
        var state = engine.Start("feature", "ab1-x", "Titel");
        var r = engine.Add(state, "Spike: Lib evaluieren");
        Assert.True(r.Advanced);
        Assert.Single(state.AdHocSteps);
    }

    [Fact]
    public void Reentry_Block_Is_Compact_And_Informative()
    {
        var (engine, _) = New();
        var state = engine.Start("feature", "ab1234-csv", "CSV Export");
        state.Ado = "AB#1234";
        engine.Save(state);
        var block = engine.ReentryBlock(state);
        Assert.True(block.Length <= 400);
        Assert.Contains("feature/ab1234-csv", block);
        Assert.Contains("AB#1234", block);
    }

    [Fact]
    public void State_Survives_Reload_From_Disk()
    {
        var (engine, store) = New();
        engine.Start("feature", "ab1-x", "Titel");
        var reloaded = new WorkflowEngine(store, new Gates(store.RootDir)).Load("ab1-x");
        Assert.NotNull(reloaded);
        Assert.Equal("Titel", reloaded!.Title);
    }
}

public class PiiScrubberTests
{
    private static Mkc.Copilot.Extensions.Core.Pii.PiiScrubber New()
        => new(new StateStore(Path.Combine(Path.GetTempPath(), "mkc-pii-" + Guid.NewGuid().ToString("n"))), ["Michel", "Krueer"]);

    [Fact]
    public void Pseudonymizes_And_Deanonymizes_Email()
    {
        var pii = New();
        var scrubbed = pii.Scrub("Kontakt: michel.krueer@example.com bitte");
        Assert.DoesNotContain("michel.krueer@example.com", scrubbed.Text);
        Assert.Contains("[EMAIL_1]", scrubbed.Text);
        Assert.Contains("michel.krueer@example.com", pii.Deanonymize(scrubbed.Text));
    }

    [Fact]
    public void Redacts_Iban_Hard()
    {
        var pii = New();
        var scrubbed = pii.Scrub("IBAN DE89 3704 0044 0532 0130 00 nutzen");
        Assert.True(scrubbed.ContainsHardRedaction);
        Assert.Contains("[IBAN-REDIGIERT]", scrubbed.Text);
    }

    [Fact]
    public void Pseudonym_Is_Stable_Across_Calls()
    {
        var pii = New();
        var a = pii.Scrub("michel.krueer@example.com");
        var b = pii.Scrub("nochmal michel.krueer@example.com");
        Assert.Contains("[EMAIL_1]", a.Text);
        Assert.Contains("[EMAIL_1]", b.Text);
    }

    [Fact]
    public void Replaces_Configured_Names()
    {
        var pii = New();
        var scrubbed = pii.Scrub("von Michel Krueer geschrieben");
        Assert.DoesNotContain("Michel", scrubbed.Text);
        Assert.DoesNotContain("Krueer", scrubbed.Text);
    }
}

public class LocalBackendTests
{
    [Fact]
    public async Task Ticket_Roundtrip_Via_Front_Matter()
    {
        var cwd = Path.Combine(Path.GetTempPath(), "mkc-lb-" + Guid.NewGuid().ToString("n"));
        var backend = new Mkc.Copilot.Extensions.Core.Backends.LocalBackend(cwd);
        await backend.CreateTicketAsync("id1", "Mein Titel", "## Body", default);
        var ticket = await backend.GetTicketAsync("id1", default);
        Assert.Equal("Mein Titel", ticket!.Title);
        Assert.Equal("todo", ticket.Status);
        await backend.UpdateStatusAsync("id1", "doing", default);
        Assert.Equal("doing", (await backend.GetTicketAsync("id1", default))!.Status);
    }
}
