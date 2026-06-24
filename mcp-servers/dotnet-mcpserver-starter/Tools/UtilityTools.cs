using System.ComponentModel;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using ModelContextProtocol.Server;

namespace McpServerStarter;

[McpServerToolType]
public static class UtilityTools
{
    [McpServerTool, Description("Generate a cryptographically secure password.")]
    public static string PasswordGenerate(
        [Description("Password length (8–128)")] int length = 20,
        [Description("Include symbol characters")] bool symbols = true)
    {
        const string lower   = "abcdefghjkmnpqrstuvwxyz";
        const string upper   = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string digits  = "23456789";
        const string syms    = "!@#$%^&*-_=+?";

        var charset = lower + upper + digits + (symbols ? syms : "");
        var result  = new StringBuilder(length);

        for (int i = 0; i < length; i++)
            result.Append(charset[RandomNumberGenerator.GetInt32(charset.Length)]);

        return result.ToString();
    }

    [McpServerTool, Description("Generate a new GUID / UUID v4.")]
    public static string NewGuid() => Guid.NewGuid().ToString();

    [McpServerTool, Description("Generate an Azure DevOps branch name for a work item.")]
    public static string WorkItemBranchName(
        [Description("Work item ID (e.g. 1234)")] int id,
        [Description("Work item title")] string title)
    {
        var slug = Regex.Replace(title.ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
        if (slug.Length > 40) slug = slug[..40].TrimEnd('-');
        return $"feature/AB-{id}-{slug}";
    }
}
