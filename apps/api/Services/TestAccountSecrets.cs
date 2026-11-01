using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Axtest.Api.Data;
using Axtest.Api.Models;

namespace Axtest.Api.Services;
public class TestAccountSecrets(AppDbContext db, IDataProtectionProvider protection)
{
    public static void Validate(Dictionary<string, string>? values)
    {
        if (values is null) return;
        if (values.Count > 32 || values.Any(v => !System.Text.RegularExpressions.Regex.IsMatch(v.Key, @"^AXTEST_[A-Z0-9_]{1,64}$") || v.Value is null || v.Value.Length > 4096)
            || values.Sum(v => v.Value?.Length ?? 0) > 16384) throw new ArgumentException("Use at most 32 AXTEST_ inputs, up to 4096 characters each and 16 KB total.");
    }
    public async Task<string> Url(Project project, string environment)
    {
        if (environment is not ("production" or "staging" or "local")) throw new ArgumentException("Unknown environment.");
        var url = project.BaseUrl;
        if (environment != "production") {
            var env = await db.ProjectEnvironments.SingleOrDefaultAsync(e => e.ProjectId == project.Id && e.Name == environment);
            if (env is null) throw new ArgumentException("Configure the selected environment URL first.");
            url = env.UseProductionFallback ? project.BaseUrl : env.BaseUrl;
        }
        if (!Uri.TryCreate(url, UriKind.Absolute, out var parsed) || parsed.Scheme is not ("http" or "https")) throw new ArgumentException("Configure a valid HTTP(S) environment URL first.");
        return parsed.AbsoluteUri.TrimEnd('/');
    }
    private IDataProtector Protector(ProjectTestAccount account) => protection.CreateProtector("axtest.test-accounts.v1", account.ProjectId.ToString(), account.Environment, account.Id.ToString());
    public void Protect(ProjectTestAccount account, Dictionary<string, string> values) {
        Validate(values);
        if (values.Count == 0 || values.ContainsKey("AXTEST_CASE")) throw new ArgumentException("Save account inputs only. AXTEST_CASE is generated separately for each run.");
        account.VariableNamesJson = JsonSerializer.Serialize(values.Keys.Order());
        account.ProtectedValues = Protector(account).Protect(JsonSerializer.Serialize(values));
    }
    public async Task<Dictionary<string, string>> Resolve(long projectId, string environment, string url, Guid? accountId, Dictionary<string, string>? overrides)
    {
        Validate(overrides);
        var values = new Dictionary<string, string>();
        if (accountId is Guid id) {
            var account = await db.ProjectTestAccounts.SingleOrDefaultAsync(a => a.Id == id && a.ProjectId == projectId && a.Environment == environment);
            if (account is null) throw new ArgumentException("Choose an account belonging to this project and environment.");
            if (account.TargetUrl != url) throw new ArgumentException("The environment URL changed. Save a new account for this URL before running.");
            try { values = JsonSerializer.Deserialize<Dictionary<string, string>>(Protector(account).Unprotect(account.ProtectedValues))!; }
            catch (System.Security.Cryptography.CryptographicException) { throw new ArgumentException("This account cannot be decrypted with the current server key. Replace its credentials."); }
        }
        foreach (var pair in overrides ?? []) values[pair.Key] = pair.Value;
        Validate(values);
        return values;
    }
}
