using System.Net;
using System.Text;
using Mkc.Copilot.Extensions.Core.Backends;
using Mkc.Copilot.Extensions.Core.Pii;
using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Tests;

/// <summary>Aufgezeichneter HTTP-Handler: liefert je Request-Zähler eine Fixture; zählt Aufrufe.</summary>
public sealed class FakeHandler(Func<HttpRequestMessage, int, (HttpStatusCode, string)> responder) : HttpMessageHandler
{
    public int Calls { get; private set; }
    public List<HttpRequestMessage> Requests { get; } = [];
    public List<string> SentBodies { get; } = [];

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Requests.Add(request);
        SentBodies.Add(request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken));
        var (code, body) = responder(request, Calls++);
        return new HttpResponseMessage(code) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
    }
}

public class AdoBackendTests
{
    private static PiiScrubber Pii()
        => new(new StateStore(Path.Combine(Path.GetTempPath(), "mkc-ado-" + Guid.NewGuid().ToString("n"))), ["Michel"]);

    [Fact]
    public async Task CreateTicket_Posts_And_Parses_Digest()
    {
        var handler = new FakeHandler((_, _) => (HttpStatusCode.OK,
            """{"id":42,"fields":{"System.Title":"Titel","System.State":"New"}}"""));
        var backend = new AdoBackend(new RestClient(new HttpClient(handler)), new RemoteConfig { AdoPat = "x" }, Pii());

        var ticket = await backend.CreateTicketAsync("x", "Titel", "Body von Michel", default);

        Assert.Equal("AB#42", ticket.Id);
        Assert.Equal(1, handler.Calls);
        // PII wurde vor dem Senden gescrubbt:
        Assert.DoesNotContain("Michel", handler.SentBodies[0]);
    }
}

public class ConfluenceStorageTests
{
    [Fact]
    public void Converts_Headings_Lists_Code()
    {
        var md = "# Titel\n\nText\n\n- a\n- b\n\n```\ncode\n```";
        var storage = ConfluenceBackend.MarkdownToStorage(md);
        Assert.Contains("<h1>Titel</h1>", storage);
        Assert.Contains("<li>a</li>", storage);
        Assert.Contains("ac:name=\"code\"", storage);
    }

    [Fact]
    public void Escapes_Html_And_Renders_Links()
    {
        var storage = ConfluenceBackend.MarkdownToStorage("Siehe [Docs](https://x.de) & <b>");
        Assert.Contains("<a href=\"https://x.de\">Docs</a>", storage);
        Assert.Contains("&amp;", storage);
        Assert.Contains("&lt;b&gt;", storage);
    }
}

public class SyncEngineTests
{
    private static (SyncEngine sync, string cwd, FakeHandler handler) New()
    {
        var cwd = Path.Combine(Path.GetTempPath(), "mkc-sync-" + Guid.NewGuid().ToString("n"));
        var pii = new PiiScrubber(new StateStore(Path.Combine(cwd, "state")), ["Michel"]);
        var handler = new FakeHandler((req, call) =>
        {
            // POST $Task ⇒ neues WorkItem 100; PATCH ⇒ ok; GET ⇒ WorkItem
            if (req.Method == HttpMethod.Post)
                return (HttpStatusCode.OK, """{"id":100,"fields":{"System.Title":"T","System.State":"New"}}""");
            return (HttpStatusCode.OK, """{"id":100,"fields":{"System.Title":"T","System.State":"Active","System.Description":"remote body"}}""");
        });
        var ado = new AdoBackend(new RestClient(new HttpClient(handler)), new RemoteConfig { AdoPat = "x" }, pii);
        var local = new LocalBackend(cwd);
        return (new SyncEngine(cwd, local, ado), cwd, handler);
    }

    [Fact]
    public async Task Push_Is_Idempotent_Creates_Single_WorkItem()
    {
        var (sync, cwd, handler) = New();
        await new LocalBackend(cwd).CreateTicketAsync("id1", "Titel", "Plan", default);

        var first = await sync.PushAsync("id1", "Titel", default);
        var second = await sync.PushAsync("id1", "Titel", default);

        Assert.Equal("AB#100", first.AdoRef);
        Assert.Equal("AB#100", second.AdoRef);
        // Genau ein POST (Create); der zweite Push ist ein PATCH (Update).
        Assert.Equal(1, handler.Requests.Count(r => r.Method == HttpMethod.Post));
    }

    [Fact]
    public async Task Pull_Writes_Remote_Body_To_Local_Plan()
    {
        var (sync, cwd, _) = New();
        await new LocalBackend(cwd).CreateTicketAsync("id1", "Titel", "Plan", default);
        await sync.PushAsync("id1", "Titel", default); // Link herstellen

        var outcome = await sync.PullAsync("id1", default);

        Assert.True(outcome.Success);
        var plan = await new LocalBackend(cwd).ReadPlanAsync("id1", default);
        Assert.Contains("remote body", plan);
    }

    [Fact]
    public async Task Pull_Without_Link_Fails_Gracefully()
    {
        var (sync, cwd, _) = New();
        await new LocalBackend(cwd).CreateTicketAsync("id1", "Titel", "Plan", default);
        var outcome = await sync.PullAsync("id1", default);
        Assert.False(outcome.Success);
    }
}
