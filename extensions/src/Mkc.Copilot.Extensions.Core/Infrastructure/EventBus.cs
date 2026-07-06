using System.Collections.Concurrent;
using System.Threading.Channels;

namespace Mkc.Copilot.Extensions.Core.Infrastructure;

/// <summary>
/// In-Process-Pub/Sub über einen Channel: Module innerhalb eines Heads koppeln lose
/// über Ereignisse statt Direktaufrufe. Reihenfolge bleibt erhalten (Single-Reader-Pump).
/// </summary>
public sealed class EventBus : IAsyncDisposable
{
    private readonly Channel<object> _channel = Channel.CreateUnbounded<object>(
        new UnboundedChannelOptions { SingleReader = true });
    private readonly ConcurrentDictionary<Type, List<Func<object, CancellationToken, Task>>> _handlers = new();
    private readonly CancellationTokenSource _cts = new();
    private readonly Task _pump;

    public EventBus() => _pump = Task.Run(PumpAsync);

    public void Subscribe<T>(Func<T, CancellationToken, Task> handler) where T : notnull
        => _handlers.GetOrAdd(typeof(T), _ => []).Add((e, ct) => handler((T)e, ct));

    public ValueTask PublishAsync<T>(T evt) where T : notnull
        => _channel.Writer.WriteAsync(evt, _cts.Token);

    private async Task PumpAsync()
    {
        await foreach (var evt in _channel.Reader.ReadAllAsync(_cts.Token).ConfigureAwait(false))
        {
            if (!_handlers.TryGetValue(evt.GetType(), out var list)) continue;
            foreach (var h in list)
            {
                try { await h(evt, _cts.Token).ConfigureAwait(false); }
                catch (OperationCanceledException) { return; }
                catch (Exception ex) { await Console.Error.WriteLineAsync($"[eventbus] handler error: {ex.Message}"); }
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        _channel.Writer.TryComplete();
        try { await _pump.WaitAsync(TimeSpan.FromSeconds(2)); } catch { /* Pump hängt: hart abbrechen */ }
        await _cts.CancelAsync();
    }
}
