using System.Text.RegularExpressions;

namespace Mkc.Copilot.Extensions.Core.Policy;

public sealed record SecretFinding(string Kind, string Excerpt);

/// <summary>
/// Secret-Erkennung: bekannte Muster + Shannon-Entropie in Keyword-Nähe.
/// Läuft auf Tool-Args (preToolUse) und Tool-Output (postToolUse).
/// </summary>
public static partial class SecretScanner
{
    private const double EntropyThreshold = 4.0;
    private const int MinTokenLength = 20;

    [GeneratedRegex(@"AKIA[0-9A-Z]{16}")]
    private static partial Regex AwsKey();

    [GeneratedRegex(@"\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b")]
    private static partial Regex GitHubToken();

    [GeneratedRegex(@"\bgithub_pat_[A-Za-z0-9_]{60,}\b")]
    private static partial Regex GitHubFineGrained();

    [GeneratedRegex(@"\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b")]
    private static partial Regex Jwt();

    [GeneratedRegex(@"-----BEGIN [A-Z ]*PRIVATE KEY-----")]
    private static partial Regex PemKey();

    [GeneratedRegex(@"(?i)\b(password|passwd|secret|token|apikey|api_key|pat|credential)\b[^\n]{0,40}?[=:]\s*['""]?(?<value>[A-Za-z0-9+/_\-\.]{20,})")]
    private static partial Regex KeywordAssignment();

    public static IReadOnlyList<SecretFinding> Scan(string text)
    {
        if (string.IsNullOrEmpty(text)) return [];
        var findings = new List<SecretFinding>();

        AddMatches(findings, "aws-access-key", AwsKey(), text);
        AddMatches(findings, "github-token", GitHubToken(), text);
        AddMatches(findings, "github-fine-grained-pat", GitHubFineGrained(), text);
        AddMatches(findings, "jwt", Jwt(), text);
        AddMatches(findings, "private-key", PemKey(), text);

        foreach (Match m in KeywordAssignment().Matches(text))
        {
            var value = m.Groups["value"].Value;
            if (value.Length >= MinTokenLength && ShannonEntropy(value) >= EntropyThreshold)
                findings.Add(new SecretFinding("high-entropy-near-keyword", Redact(value)));
        }
        return findings;
    }

    private static void AddMatches(List<SecretFinding> findings, string kind, Regex regex, string text)
    {
        foreach (Match m in regex.Matches(text))
            findings.Add(new SecretFinding(kind, Redact(m.Value)));
    }

    /// <summary>Nie das Secret selbst weitergeben — nur Anfang/Länge.</summary>
    private static string Redact(string value) =>
        value.Length <= 8 ? "****" : $"{value[..4]}…({value.Length} Zeichen)";

    public static double ShannonEntropy(string s)
    {
        if (s.Length == 0) return 0;
        var groups = s.GroupBy(c => c);
        return -groups.Sum(g =>
        {
            var p = (double)g.Count() / s.Length;
            return p * Math.Log2(p);
        });
    }
}
