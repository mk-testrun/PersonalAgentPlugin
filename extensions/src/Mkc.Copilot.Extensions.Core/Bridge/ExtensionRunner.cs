using System.Text.Json;

namespace Mkc.Copilot.Extensions.Core.Bridge;

/// <summary>Vertrag eines Heads: Identität, Manifest, Handler-Registrierung.</summary>
public interface IExtensionHead
{
    ReadyEvent Identity { get; }
    RegistrationManifest Manifest { get; }
    void Register(BridgeHost host);
}

/// <summary>
/// Gemeinsamer Einstieg aller Heads: `--print-manifest` (Validator/CI, offline)
/// oder Bridge-Betrieb an stdin/stdout.
/// </summary>
public static class ExtensionRunner
{
    public static async Task<int> RunAsync(IExtensionHead head, string[] args)
    {
        if (args.Contains("--print-manifest"))
        {
            Console.WriteLine(BridgeJson.Serialize(head.Manifest));
            return 0;
        }

        var host = new BridgeHost(Console.In, Console.Out, head.Identity);
        host.On("init", (_, _) =>
            Task.FromResult<JsonElement?>(BridgeJson.ToElement(head.Manifest)));
        head.Register(host);
        await host.RunAsync();
        return 0;
    }
}
