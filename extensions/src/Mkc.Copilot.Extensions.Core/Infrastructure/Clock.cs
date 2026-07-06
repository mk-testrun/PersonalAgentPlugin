namespace Mkc.Copilot.Extensions.Core.Infrastructure;

/// <summary>Testbare Zeitquelle (ModeContract-TTL, Budgets, Recorder).</summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public sealed class SystemClock : IClock
{
    public static readonly SystemClock Instance = new();
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
