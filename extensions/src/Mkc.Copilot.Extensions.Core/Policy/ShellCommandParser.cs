namespace Mkc.Copilot.Extensions.Core.Policy;

/// <summary>
/// Zerlegt einen Shell-Befehlstext in einzelne argv-Kommandos — die Grundlage aller
/// Guardrail-Entscheidungen (kein Substring-Matching, ADR-0004 „robusteres Parsing").
/// Behandelt: Verkettung (&amp;&amp;, ||, ;, |, &amp;, Newline), Quoting ('…', "…", \x),
/// Subshell-Wrapper (sh/bash/zsh/dash -c "…" → Rekursion), Kommando-Substitution
/// ($(…) und `…` → zusätzlich als eigene Kommandos), env-/Variablen-Präfixe
/// (FOO=1 cmd, env FOO=1 cmd) sowie `git -C &lt;dir&gt;` (Pfad-Präfix wird entfernt).
/// </summary>
public static class ShellCommandParser
{
    private static readonly HashSet<string> ShellWrappers = ["sh", "bash", "zsh", "dash", "ksh"];

    public static IReadOnlyList<string[]> Parse(string commandText)
    {
        var results = new List<string[]>();
        ParseInto(commandText, results, depth: 0);
        return results;
    }

    private static void ParseInto(string text, List<string[]> results, int depth)
    {
        if (depth > 8 || string.IsNullOrWhiteSpace(text)) return;

        foreach (var segment in SplitSegments(text))
        {
            var tokens = Tokenize(segment, out var substitutions);
            foreach (var sub in substitutions)
                ParseInto(sub, results, depth + 1);        // Inhalt von $(…)/`…` separat prüfen

            tokens = StripEnvPrefixes(tokens);
            if (tokens.Count == 0) continue;

            var cmd = BaseName(tokens[0]);
            if (ShellWrappers.Contains(cmd) && TryGetDashCArgument(tokens, out var inner))
            {
                ParseInto(inner, results, depth + 1);      // sh -c "…" ⇒ rekursiv
                continue;
            }

            if (cmd == "git") tokens = StripGitGlobalFlags(tokens);
            tokens[0] = cmd;
            results.Add([.. tokens]);
        }
    }

    /// <summary>Segmentiert auf oberster Ebene an &amp;&amp;, ||, ;, |, &amp; und Zeilenumbrüchen (quote-sicher).</summary>
    private static IEnumerable<string> SplitSegments(string text)
    {
        var current = new System.Text.StringBuilder();
        char quote = '\0';
        for (var i = 0; i < text.Length; i++)
        {
            var c = text[i];
            if (quote != '\0')
            {
                current.Append(c);
                if (c == quote && (quote == '\'' || text[i - 1] != '\\')) quote = '\0';
                continue;
            }
            switch (c)
            {
                case '\'' or '"':
                    quote = c; current.Append(c); break;
                case '&' or '|' when i + 1 < text.Length && text[i + 1] == c:
                    yield return current.ToString(); current.Clear(); i++; break;
                case ';' or '\n' or '|' or '&':
                    yield return current.ToString(); current.Clear(); break;
                default:
                    current.Append(c); break;
            }
        }
        yield return current.ToString();
    }

    /// <summary>Zerlegt ein Segment in Tokens; extrahiert $(…)- und `…`-Substitutionen.</summary>
    private static List<string> Tokenize(string segment, out List<string> substitutions)
    {
        substitutions = [];
        var tokens = new List<string>();
        var current = new System.Text.StringBuilder();
        var hasToken = false;
        char quote = '\0';

        void Flush()
        {
            if (hasToken) tokens.Add(current.ToString());
            current.Clear(); hasToken = false;
        }

        for (var i = 0; i < segment.Length; i++)
        {
            var c = segment[i];
            if (quote == '\'')
            {
                if (c == '\'') { quote = '\0'; } else { current.Append(c); hasToken = true; }
                continue;
            }
            if (quote == '"')
            {
                if (c == '"') { quote = '\0'; }
                else if (c == '\\' && i + 1 < segment.Length) { current.Append(segment[++i]); hasToken = true; }
                else if (c == '$' && i + 1 < segment.Length && segment[i + 1] == '(')
                { i = ExtractSubstitution(segment, i + 1, substitutions); hasToken = true; }
                else { current.Append(c); hasToken = true; }
                continue;
            }
            switch (c)
            {
                case '\'' or '"': quote = c; hasToken = true; break;
                case '\\' when i + 1 < segment.Length: current.Append(segment[++i]); hasToken = true; break;
                case '$' when i + 1 < segment.Length && segment[i + 1] == '(':
                    i = ExtractSubstitution(segment, i + 1, substitutions); hasToken = true; break;
                case '`':
                    var end = segment.IndexOf('`', i + 1);
                    if (end < 0) { current.Append(c); hasToken = true; break; }
                    substitutions.Add(segment[(i + 1)..end]); i = end; hasToken = true; break;
                case ' ' or '\t': Flush(); break;
                default: current.Append(c); hasToken = true; break;
            }
        }
        Flush();
        return tokens;
    }

    /// <summary>Liest ab `(`-Index eine balancierte $(…)-Gruppe; liefert Index der schließenden Klammer.</summary>
    private static int ExtractSubstitution(string s, int openParen, List<string> substitutions)
    {
        var level = 0;
        for (var i = openParen; i < s.Length; i++)
        {
            if (s[i] == '(') level++;
            else if (s[i] == ')' && --level == 0)
            {
                substitutions.Add(s[(openParen + 1)..i]);
                return i;
            }
        }
        return s.Length - 1;
    }

    private static List<string> StripEnvPrefixes(List<string> tokens)
    {
        var i = 0;
        while (i < tokens.Count && IsAssignment(tokens[i])) i++;
        if (i < tokens.Count && BaseName(tokens[i]) == "env")
        {
            i++;
            while (i < tokens.Count && (IsAssignment(tokens[i]) || tokens[i].StartsWith('-'))) i++;
        }
        return tokens[i..];

        static bool IsAssignment(string t)
        {
            var eq = t.IndexOf('=');
            return eq > 0 && t[..eq].All(ch => char.IsLetterOrDigit(ch) || ch == '_');
        }
    }

    private static bool TryGetDashCArgument(List<string> tokens, out string inner)
    {
        for (var i = 1; i < tokens.Count - 1; i++)
            if (tokens[i] == "-c") { inner = tokens[i + 1]; return true; }
        inner = ""; return false;
    }

    /// <summary>Entfernt globale git-Flags vor dem Subcommand: -C &lt;dir&gt;, -c k=v, --git-dir=…, --work-tree=….</summary>
    private static List<string> StripGitGlobalFlags(List<string> tokens)
    {
        var result = new List<string> { tokens[0] };
        var i = 1;
        while (i < tokens.Count)
        {
            var t = tokens[i];
            if (t is "-C" or "-c" && i + 1 < tokens.Count) { i += 2; continue; }
            if (t.StartsWith("--git-dir") || t.StartsWith("--work-tree") || t.StartsWith("--exec-path")) { i++; continue; }
            break;
        }
        result.AddRange(tokens[i..]);
        return result;
    }

    private static string BaseName(string token)
    {
        var slash = token.LastIndexOfAny(['/', '\\']);
        var name = slash >= 0 ? token[(slash + 1)..] : token;
        return name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) ? name[..^4] : name;
    }
}
