using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Mkc.Copilot.Extensions.Core.Workflow.Meta;

/// <summary>
/// No-Progress-Erkennung: Hash über normalisiertes Fehlerbild + git-diff-stat.
/// Zweimal identisch ⇒ die Iteration bringt nichts mehr ⇒ Loop stoppt (kein Kreisdrehen).
/// </summary>
public static partial class ProgressHash
{
    [GeneratedRegex(@"\d+")]
    private static partial Regex Numbers();
    [GeneratedRegex(@"0x[0-9a-fA-F]+")]
    private static partial Regex HexAddresses();
    [GeneratedRegex(@"[ \t]+")]
    private static partial Regex Whitespace();

    public static string Compute(string errorOutput, string diffStat)
    {
        var normalized = Normalize(errorOutput) + "\n@@\n" + Normalize(diffStat);
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(normalized)))[..16];
    }

    /// <summary>Entfernt volatile Teile (Zeilennummern, Adressen, Zeitstempel), damit „gleiches Problem" gleich hasht.</summary>
    private static string Normalize(string text)
    {
        text = HexAddresses().Replace(text, "0xADDR");
        text = Numbers().Replace(text, "N");
        text = Whitespace().Replace(text, " ");
        return text.Trim();
    }
}
