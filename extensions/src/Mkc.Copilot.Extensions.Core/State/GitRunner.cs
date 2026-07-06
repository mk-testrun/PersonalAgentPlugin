using System.Diagnostics;

namespace Mkc.Copilot.Extensions.Core.State;

public sealed record GitResult(int ExitCode, string StdOut, string StdErr)
{
    public bool Success => ExitCode == 0;
}

/// <summary>Dünner, CT-fähiger Prozess-Wrapper für git (Checkpointer, Gates, /moin).</summary>
public static class GitRunner
{
    public static async Task<GitResult> RunAsync(string workingDir, string[] args, CancellationToken ct)
    {
        var psi = new ProcessStartInfo("git")
        {
            WorkingDirectory = workingDir,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        foreach (var a in args) psi.ArgumentList.Add(a);

        using var proc = Process.Start(psi)!;
        var stdout = proc.StandardOutput.ReadToEndAsync(ct);
        var stderr = proc.StandardError.ReadToEndAsync(ct);
        try
        {
            await proc.WaitForExitAsync(ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            try { proc.Kill(entireProcessTree: true); } catch { /* schon beendet */ }
            throw;
        }
        return new GitResult(proc.ExitCode, (await stdout).Trim(), (await stderr).Trim());
    }
}
