namespace Mkc.Copilot.Extensions.Core.Autopilot;

/// <summary>
/// Modus-Erkennung mit Hysterese (Ausführungsplan §1.3 E):
/// Signal A: /autopilot on|off — autoritativ (bis "auto").
/// Signal B: ≥3 aufeinanderfolgende ToolExecutionStart ohne permission.request ⇒ Suspected,
///           weitere 3 ⇒ Autonomous.
/// Signal C: UserMessage oder Permission-Antwort mit Latenz &gt; 1,5 s ⇒ genau eine Stufe runter.
/// </summary>
public sealed class ModeDetector
{
    public static readonly TimeSpan HumanLatencyThreshold = TimeSpan.FromSeconds(1.5);
    private const int EscalationThreshold = 3;

    private SessionMode _heuristic = SessionMode.Interactive;
    private SessionMode? _authoritative;
    private int _toolStartsWithoutPermission;

    public SessionMode Current => _authoritative ?? _heuristic;

    /// <summary>/autopilot on|off ⇒ fixiert; /autopilot auto ⇒ Heuristik übernimmt wieder.</summary>
    public void SetAuthoritative(SessionMode? mode) => _authoritative = mode;
    public bool IsAuthoritative => _authoritative is not null;

    public void OnToolExecutionStart()
    {
        _toolStartsWithoutPermission++;
        if (_toolStartsWithoutPermission == EscalationThreshold && _heuristic == SessionMode.Interactive)
            _heuristic = SessionMode.Suspected;
        else if (_toolStartsWithoutPermission >= EscalationThreshold * 2 && _heuristic == SessionMode.Suspected)
            _heuristic = SessionMode.Autonomous;
    }

    public void OnPermissionRequest() => _toolStartsWithoutPermission = 0;

    public void OnPermissionAnswered(TimeSpan latency)
    {
        _toolStartsWithoutPermission = 0;
        if (latency > HumanLatencyThreshold) Descend();
    }

    public void OnUserMessage()
    {
        _toolStartsWithoutPermission = 0;
        Descend();
    }

    private void Descend() => _heuristic = _heuristic switch
    {
        SessionMode.Autonomous => SessionMode.Suspected,
        _ => SessionMode.Interactive,
    };
}
