using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Mkc.Copilot.Extensions.Core.Backends;

/// <summary>
/// Dünner REST-Helfer für ADO/Confluence: Basic-Auth, JSON, CancellationToken.
/// Testbar über einen injizierbaren HttpMessageHandler (Fake-Fixtures).
/// </summary>
public sealed class RestClient(HttpClient http)
{
    public static RestClient WithBasicAuth(string user, string token, HttpMessageHandler? handler = null)
    {
        var client = handler is null ? new HttpClient() : new HttpClient(handler);
        var raw = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{user}:{token}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", raw);
        return new RestClient(client);
    }

    public async Task<JsonElement> SendJsonAsync(HttpMethod method, string url, object? body, string contentType, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(method, url);
        if (body is not null)
        {
            var json = body is string s ? s : JsonSerializer.Serialize(body);
            req.Content = new StringContent(json, Encoding.UTF8, contentType);
        }
        using var res = await http.SendAsync(req, ct).ConfigureAwait(false);
        var text = await res.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
        if (!res.IsSuccessStatusCode)
            throw new HttpRequestException($"{(int)res.StatusCode} {res.ReasonPhrase}: {Truncate(text, 300)}");
        return text.Length == 0 ? default : JsonDocument.Parse(text).RootElement.Clone();
    }

    public Task<JsonElement> GetAsync(string url, CancellationToken ct) =>
        SendJsonAsync(HttpMethod.Get, url, null, "application/json", ct);

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
}
