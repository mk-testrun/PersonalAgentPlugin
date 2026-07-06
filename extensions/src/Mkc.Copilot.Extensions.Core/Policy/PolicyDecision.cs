namespace Mkc.Copilot.Extensions.Core.Policy;

public enum Verdict
{
    Allow,
    /// <summary>Interaktiv: ui.confirm mit Deadline; autonom/unbekannt: deny.</summary>
    Confirm,
    Deny,
}

public sealed record PolicyDecision(Verdict Verdict, string Rule = "", string Reason = "")
{
    public static readonly PolicyDecision Allow = new(Verdict.Allow);
    public static PolicyDecision Deny(string rule, string reason) => new(Verdict.Deny, rule, reason);
    public static PolicyDecision Confirm(string rule, string reason) => new(Verdict.Confirm, rule, reason);

    /// <summary>Strengstes Votum gewinnt (Deny > Confirm > Allow).</summary>
    public static PolicyDecision Strictest(IEnumerable<PolicyDecision> decisions)
    {
        var result = Allow;
        foreach (var d in decisions)
            if (d.Verdict > result.Verdict) result = d;
        return result;
    }
}
