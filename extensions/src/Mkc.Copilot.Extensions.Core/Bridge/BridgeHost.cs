using System.Collections.Concurrent;
using System.Text.Json;

namespace Mkc.Copilot.Extensions.Core.Bridge;

/// <summary>Handler für eingehende req/event-Nachrichten des Shims.</summary>
public delegate Task<JsonElement?> BridgeHandler(JsonElement payload, CancellationToken ct);

/// <summary>
/// Herzstück jedes Heads: stdin-Leseschleife, id-Korrelation, Dispatch, Timeouts,
/// Gegenrichtung (ui.*-Requests an den Shim). shutdown/Reload cancelt alle laufenden Ops.
/// </summary>
public sealed class BridgeHost(TextReader input, TextWriter output, ReadyEvent identity)
{
    private readonly Dictionary<string, BridgeHandler> _handlers = new();
    private readonly ConcurrentDictionary<string, TaskCompletionSource<BridgeMessage>> _pending = new();
    private readonly SemaphoreSlim _writeLock = new(1, 1);
    private readonly CancellationTokenSource _shutdown = new();

    public CancellationToken ShutdownToken => _shutdown.Token;

    public void On(string method, BridgeHandler handler) => _handlers[method] = handler;

    /// <summary>Typisierter Komfort-Handler.</summary>
    public void On<TIn, TOut>(string method, Func<TIn, CancellationToken, Task<TOut?>> handler)
        => On(method, async (payload, ct) =>
        {
            var arg = BridgeJson.Deserialize<TIn>(payload);
            var result = await handler(arg, ct).ConfigureAwait(false);
            return result is null ? null : BridgeJson.ToElement(result);
        });

    public async Task RunAsync()
    {
        await EmitAsync(new BridgeMessage { Type = "event", Method = "ready", Payload = BridgeJson.ToElement(identity) })
            .ConfigureAwait(false);

        while (!_shutdown.IsCancellationRequested)
        {
            string? line;
            try { line = await input.ReadLineAsync(_shutdown.Token).ConfigureAwait(false); }
            catch (OperationCanceledException) { break; }
            if (line is null) break;                       // stdin zu ⇒ Shim weg ⇒ Ende
            if (string.IsNullOrWhiteSpace(line)) continue;

            BridgeMessage msg;
            try { msg = JsonSerializer.Deserialize(line, BridgeJsonContext.Default.BridgeMessage)!; }
            catch (Exception ex)
            {
                await Console.Error.WriteLineAsync($"[bridge] kaputte Zeile ignoriert: {ex.Message}");
                continue;
            }

            switch (msg.Type)
            {
                case "res" when msg.Id is not null && _pending.TryRemove(msg.Id, out var tcs):
                    tcs.TrySetResult(msg);
                    break;
                case "req" when msg.Method == "shutdown":
                    await EmitResAsync(msg.Id!, ok: true, payload: null).ConfigureAwait(false);
                    await _shutdown.CancelAsync();
                    break;
                case "req" or "event":
                    _ = DispatchAsync(msg);                // parallel, id-korreliert
                    break;
            }
        }
    }

    private async Task DispatchAsync(BridgeMessage msg)
    {
        if (msg.Method is null || !_handlers.TryGetValue(msg.Method, out var handler))
        {
            if (msg.Type == "req")
                await EmitResAsync(msg.Id!, ok: false, error: new("unknown_method", $"kein Handler: {msg.Method}"))
                    .ConfigureAwait(false);
            return;
        }

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(_shutdown.Token);
        cts.CancelAfter(Timeouts.For(msg.Method));
        try
        {
            var result = await handler(msg.Payload ?? default, cts.Token).ConfigureAwait(false);
            if (msg.Type == "req")
                await EmitResAsync(msg.Id!, ok: true, payload: result).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (msg.Type == "req")
        {
            await EmitResAsync(msg.Id!, ok: false, error: new("timeout", $"{msg.Method} abgebrochen")).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"[bridge] {msg.Method}: {ex.Message}");
            if (msg.Type == "req")
                await EmitResAsync(msg.Id!, ok: false, error: new("handler_error", ex.Message)).ConfigureAwait(false);
        }
    }

    /// <summary>Request an den Shim (ui.confirm/select/input …); Timeout ⇒ null.</summary>
    public async Task<TOut?> RequestAsync<TIn, TOut>(string method, TIn payload, TimeSpan timeout, CancellationToken ct)
        where TOut : class
    {
        var id = Guid.NewGuid().ToString("n");
        var tcs = new TaskCompletionSource<BridgeMessage>(TaskCreationOptions.RunContinuationsAsynchronously);
        _pending[id] = tcs;
        await EmitAsync(new BridgeMessage { Type = "req", Id = id, Method = method, Payload = BridgeJson.ToElement(payload) })
            .ConfigureAwait(false);
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct, _shutdown.Token);
        try
        {
            var res = await tcs.Task.WaitAsync(timeout, linked.Token).ConfigureAwait(false);
            return res is { Ok: true, Payload: { } p } ? BridgeJson.Deserialize<TOut>(p) : null;
        }
        catch (TimeoutException) { return null; }
        catch (OperationCanceledException) { return null; }
        finally { _pending.TryRemove(id, out _); }
    }

    public Task EmitEventAsync<T>(string method, T payload)
        => EmitAsync(new BridgeMessage { Type = "event", Method = method, Payload = BridgeJson.ToElement(payload) });

    private async Task EmitResAsync(string id, bool ok, JsonElement? payload = null, BridgeError? error = null)
        => await EmitAsync(new BridgeMessage { Type = "res", Id = id, Method = null, Ok = ok, Payload = payload, Error = error })
            .ConfigureAwait(false);

    private async Task EmitAsync(BridgeMessage msg)
    {
        var line = JsonSerializer.Serialize(msg, BridgeJsonContext.Default.BridgeMessage);
        await _writeLock.WaitAsync().ConfigureAwait(false);
        try
        {
            await output.WriteLineAsync(line).ConfigureAwait(false);
            await output.FlushAsync().ConfigureAwait(false);
        }
        finally { _writeLock.Release(); }
    }
}
