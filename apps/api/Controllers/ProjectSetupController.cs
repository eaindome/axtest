using System.Text.RegularExpressions;
using Axtest.Api.Data;
using Axtest.Api.Models;
using Axtest.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Controllers;

public record SaveProjectSetup(bool? LoginRequired, Guid? LoginFlowId, Guid? DefaultAccountId);

[ApiController, Authorize, Route("api/projects/{projectId:long}/setup/{environment}")]
public class ProjectSetupController(AppDbContext db, ProjectAccess access, TestAccountSecrets secrets, RunnerProcess runner, IHostEnvironment host, IConfiguration config) : ControllerBase
{
    private static bool Valid(string value) => value is "production" or "staging" or "local";
    private static object Dto(ProjectSetup s) => new { s.Environment, s.LoginRequired, s.LoginFlowId, s.DefaultAccountId };
    [HttpGet]
    public async Task<IActionResult> Get(long projectId, string environment) {
        if (!Valid(environment)) return BadRequest("Unknown environment.");
        if (await access.Get(projectId) is null) return NotFound();
        var setup = await db.ProjectSetups.FindAsync(projectId, environment);
        return Ok(Dto(setup ?? new ProjectSetup { ProjectId = projectId, Environment = environment }));
    }
    [HttpPut]
    public async Task<IActionResult> Save(long projectId, string environment, SaveProjectSetup request) {
        if (!Valid(environment)) return BadRequest("Unknown environment.");
        var project = await access.Get(projectId, true);
        if (project is null) return NotFound();
        if (request.LoginFlowId is Guid flowId) {
            var flow = await db.ProjectFiles.SingleOrDefaultAsync(f => f.Id == flowId && f.ProjectId == projectId && !f.IsFolder && f.Path.StartsWith("auth/"));
            if (flow is null || !Regex.IsMatch(flow.Content, @"(?m)^\s*AUTH\s+") || Regex.IsMatch(flow.Content, @"(?m)^\s*TEST\s+")) return BadRequest("Choose a reusable login flow from this project.");
        }
        if (request.DefaultAccountId is Guid accountId) {
            var account = await db.ProjectTestAccounts.SingleOrDefaultAsync(a => a.Id == accountId && a.ProjectId == projectId && a.Environment == environment);
            if (account is null || account.TargetUrl != await secrets.Url(project, environment)) return BadRequest("Choose an account saved for this environment and address.");
        }
        var setup = await db.ProjectSetups.FindAsync(projectId, environment);
        if (setup is null) { setup = new ProjectSetup { ProjectId = projectId, Environment = environment }; db.ProjectSetups.Add(setup); }
        setup.LoginRequired = request.LoginRequired; setup.LoginFlowId = request.LoginFlowId; setup.DefaultAccountId = request.DefaultAccountId;
        await db.SaveChangesAsync();
        return Ok(Dto(setup));
    }
    private IActionResult? Restriction() {
        if (!host.IsDevelopment() || !config.GetValue("Runner:Enabled", host.IsDevelopment())) return StatusCode(503, "Access checks require the local Development runner.");
        if (HttpContext.Connection.RemoteIpAddress is not { } remote || !System.Net.IPAddress.IsLoopback(remote)) return StatusCode(403, "Access checks must be started from the API computer.");
        return null;
    }
    [HttpPost("check-connection")]
    public async Task<IActionResult> CheckConnection(long projectId, string environment) {
        var project = await access.Get(projectId, true);
        if (project is null) return NotFound();
        if (Restriction() is { } blocked) return blocked;
        var url = await secrets.Url(project, environment);
        using var handler = new HttpClientHandler { AllowAutoRedirect = false, UseCookies = false };
        using var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(10) };
        try {
            using var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, HttpContext.RequestAborted);
            var code = (int)response.StatusCode;
            var ok = code is >= 200 and < 400;
            return Ok(new { ok, url, statusCode = code, message = ok ? $"Application responded (HTTP {code})." : $"The server responded with HTTP {code}. Check the address and application access." });
        } catch (Exception error) when (error is HttpRequestException or TaskCanceledException) {
            return Ok(new { ok = false, url, message = "Could not reach the application within 10 seconds. Check that it is running and accessible from the API computer." });
        }
    }
    [HttpPost("check-login")]
    public async Task<IActionResult> CheckLogin(long projectId, string environment, [FromQuery] Guid? accountId = null) {
        var project = await access.Get(projectId, true);
        if (project is null) return NotFound();
        if (Restriction() is { } blocked) return blocked;
        var setup = await db.ProjectSetups.FindAsync(projectId, environment);
        if (setup?.LoginRequired != true || setup.LoginFlowId is null) return BadRequest("Save a login flow first.");
        var selectedAccount = accountId ?? setup.DefaultAccountId;
        if (selectedAccount is null) return BadRequest("Choose a saved test account to check.");
        var flow = await db.ProjectFiles.SingleOrDefaultAsync(f => f.ProjectId == projectId && f.Id == setup.LoginFlowId && !f.IsFolder && f.Path.StartsWith("auth/"));
        if (flow is null || !Regex.IsMatch(flow.Content, @"(?m)^\s*AUTH\s+") || Regex.IsMatch(flow.Content, @"(?m)^\s*TEST\s+")) return BadRequest("Choose a reusable AUTH flow, rather than a test suite.");
        var url = await secrets.Url(project, environment);
        var values = await secrets.Resolve(projectId, environment, url, selectedAccount, null);
        var result = await runner.Invoke(new { command = "run", content = flow.Content, fileName = flow.Path, baseUrl = url, variables = values, timeoutMs = 30000, browserExecutablePath = runner.BrowserExecutablePath }, cancellation: HttpContext.RequestAborted);
        var passed = result.GetProperty("status").GetString() == "passed";
        string? detail = null;
        if (!passed && result.TryGetProperty("tests", out var tests)) {
            foreach (var test in tests.EnumerateArray()) {
                if (!test.TryGetProperty("steps", out var steps)) continue;
                foreach (var step in steps.EnumerateArray()) {
                    if (step.TryGetProperty("error", out var failure) && failure.ValueKind == System.Text.Json.JsonValueKind.String) { detail = failure.GetString(); break; }
                }
                if (detail is not null) break;
            }
        }
        // Worker output is redacted before reaching this controller.
        return Ok(new { ok = passed, url, detail, message = passed ? "Login steps and the success check passed." : "Login did not pass. Check the account, field labels, and success condition, then try again." });
    }
}
