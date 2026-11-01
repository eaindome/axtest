using System.Text.Json;
using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Models;
using Axtest.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Controllers;

[ApiController, Authorize, Route("api/projects/{projectId:long}/runs")]
public class RunsController(AppDbContext db, ProjectAccess access, ExplorerService explorer, RunnerProcess runner, RunInputs inputs, IHostEnvironment host, IConfiguration config) : ControllerBase
{
    [HttpPost("file")]
    public async Task<IActionResult> RunFile(long projectId, RunFileRequest req, [FromQuery] bool wait = true)
    {
        var project = await access.Get(projectId, true);
        if (project is null) return NotFound();
        if (req.Variables is { } variables && (variables.Count > 32 || variables.Any(v =>
            !System.Text.RegularExpressions.Regex.IsMatch(v.Key, @"^AXTEST_[A-Z0-9_]{1,64}$") || v.Value is null || v.Value.Length > 4096)
            || variables.Sum(v => v.Value?.Length ?? 0) > 16384))
            return BadRequest("Use at most 32 AXTEST_ runtime inputs, up to 4096 characters each and 16 KB total.");
        if (!host.IsDevelopment() || !config.GetValue("Runner:Enabled", host.IsDevelopment())) return StatusCode(503, "Browser execution is currently restricted to local Development until deployment isolation is configured.");
        if (HttpContext.Connection.RemoteIpAddress is not { } remote || !System.Net.IPAddress.IsLoopback(remote))
            return StatusCode(403, "Browser execution requires a connection from this machine until isolated runners are available.");
        var file = await explorer.File(projectId, req.FileId);
        if (req.Content is null || req.Content.Length > 1_000_000) return BadRequest("Content must be at most 1 MB.");
        if (req.Environment is not ("production" or "staging" or "local")) return BadRequest("Unknown environment.");
        string? url = project.BaseUrl;
        if (req.Environment != "production")
        {
            var env = await db.ProjectEnvironments.FirstOrDefaultAsync(e => e.ProjectId == projectId && e.Name == req.Environment);
            if (env is null) return BadRequest("Configure the selected environment before running tests.");
            url = env.UseProductionFallback ? project.BaseUrl : env.BaseUrl;
        }
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https")) return BadRequest("A valid HTTP(S) environment URL is required.");
        if (await db.TestRuns.CountAsync(r => r.Status == RunStatus.Pending || r.Status == RunStatus.Running) >= 30) return StatusCode(429, "The run queue is full.");
        var validation = await runner.Invoke(new { command = "validate", content = req.Content, fileName = file.Path, testNames = req.TestNames }, cancellation: HttpContext.RequestAborted);
        var count = validation.GetProperty("testCount").GetInt32();
        if (count > 500) return BadRequest("At most 500 tests can be submitted per run.");
        var files = await db.ProjectFiles.Where(f => f.ProjectId == projectId && !f.IsFolder && (f.Path.StartsWith("auth/") || f.Path.StartsWith("modules/")))
            .Select(f => new { path = f.Path, content = f.Content }).ToListAsync();
        var runtimeKey = req.Variables?.Count > 0 ? inputs.Store(req.Variables) : null;
        var run = new TestRun
        {
            ProjectId = projectId,
            FileId = file.Id,
            FileName = file.Path,
            Environment = req.Environment,
            TriggeredBy = "editor",
            TotalTests = count,
            InputJson = JsonSerializer.Serialize(new { command = "run", content = req.Content, fileName = file.Path, baseUrl = url, testNames = req.TestNames, selectedTests = validation.GetProperty("selectedTests"), files, runtimeKey, headed = req.Headed }),
        };
        db.TestRuns.Add(run);
        try { await db.SaveChangesAsync(); }
        catch { if (runtimeKey is not null) inputs.Remove(runtimeKey); throw; }
        if (wait)
        {
            var deadline = DateTime.UtcNow.AddSeconds(Math.Clamp(config.GetValue("Runner:TimeoutSeconds", 120), 5, 300) + 10);
            while (DateTime.UtcNow < deadline)
            {
                await Task.Delay(200, HttpContext.RequestAborted);
                await db.Entry(run).ReloadAsync(HttpContext.RequestAborted);
                if (run.Status is RunStatus.Passed or RunStatus.Failed) return Ok(await Detail(projectId, run));
            }
        }
        Response.Headers.Location = $"/api/projects/{projectId}/runs/{run.Id}";
        return Accepted(await Detail(projectId, run));
    }

    [HttpPost]
    public async Task<IActionResult> Submit(long projectId, SubmitRunRequest req)
    {
        if (await access.Get(projectId, true) is null) return NotFound();
        if (req.Results is null || req.TotalTests < 1 || req.TotalTests != req.Results.Count || req.Results.Any(r => r.Status is not ("passed" or "failed" or "skipped") || r.DurationMs < 0)
            || req.PassedTests != req.Results.Count(r => r.Status == "passed") || req.FailedTests != req.Results.Count(r => r.Status == "failed") || req.DurationMs < 0 || req.CompletedAt < req.StartedAt)
            return BadRequest("Run totals, status values, or timestamps are inconsistent.");
        if (req.TestSuiteId is long suiteId && !await db.TestSuites.AnyAsync(s => s.Id == suiteId && s.Module.System.ProjectId == projectId)) return BadRequest("Suite does not belong to this project.");
        var run = new TestRun
        {
            ProjectId = projectId,
            TestSuiteId = req.TestSuiteId,
            Status = req.FailedTests > 0 || req.PassedTests == 0 ? RunStatus.Failed : RunStatus.Passed,
            Environment = req.Environment,
            TotalTests = req.TotalTests,
            PassedTests = req.PassedTests,
            FailedTests = req.FailedTests,
            DurationMs = req.DurationMs,
            TriggeredBy = req.TriggeredBy ?? "cli",
            StartedAt = req.StartedAt,
            CompletedAt = req.CompletedAt
        };
        run.Results = req.Results.Select((r, i) => new TestResult
        {
            TestId = r.TestId,
            TestName = r.TestName,
            Status = Enum.Parse<ResultStatus>(r.Status, true),
            DurationMs = r.DurationMs,
            ErrorMessage = r.ErrorMessage,
            FailedStep = r.FailedStep,
            Order = i + 1
        }).ToList();
        db.TestRuns.Add(run); await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { projectId, id = run.Id }, ListDto(run));
    }
    [HttpGet]
    public async Task<IActionResult> List(long projectId, int page = 1, int pageSize = 20)
    {
        if (await access.Get(projectId) is null) return NotFound();
        if (page < 1 || pageSize < 1 || pageSize > 100 || page > 1_000_000) return BadRequest("Invalid pagination.");
        var runs = await db.TestRuns.Include(r => r.TestSuite).Where(r => r.ProjectId == projectId).OrderByDescending(r => r.StartedAt).ThenByDescending(r => r.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(runs.Select(ListDto));
    }
    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long projectId, long id)
    {
        if (await access.Get(projectId) is null) return NotFound();
        var run = await db.TestRuns.Include(r => r.TestSuite).FirstOrDefaultAsync(r => r.Id == id && r.ProjectId == projectId);
        return run is null ? NotFound() : Ok(await Detail(projectId, run));
    }
    [HttpGet("{id:long}/artifacts/{name}")]
    public async Task<IActionResult> Artifact(long projectId, long id, string name)
    {
        if (await access.Get(projectId) is null || !await db.TestRuns.AnyAsync(r => r.ProjectId == projectId && r.Id == id)) return NotFound();
        if (name != Path.GetFileName(name) || !name.EndsWith(".png") || name.Any(c => !char.IsAsciiLetterOrDigit(c) && c is not ('-' or '_' or '.'))) return BadRequest("Invalid artifact name.");
        var path = Path.Combine(runner.ArtifactRoot, id.ToString(), name);
        return System.IO.File.Exists(path) ? PhysicalFile(path, "image/png") : NotFound();
    }
    private static RunListDto ListDto(TestRun r) => new(r.Id, r.Status.ToString().ToLowerInvariant(), r.Environment, r.TotalTests, r.PassedTests, r.FailedTests,
        r.DurationMs, r.FileName ?? r.TestSuite?.Name, r.TriggeredBy, r.StartedAt, r.CompletedAt, r.ErrorMessage);
    private async Task<RunDetailDto> Detail(long projectId, TestRun run)
    {
        var results = await db.TestResults.Where(r => r.RunId == run.Id).OrderBy(r => r.Order).ToListAsync();
        string? ArtifactUrl(string? name) => name is null ? null : $"/api/projects/{projectId}/runs/{run.Id}/artifacts/{Path.GetFileName(name)}";
        var output = results.Select(r =>
        {
            using var steps = JsonDocument.Parse(r.StepsJson);
            var list = steps.RootElement.EnumerateArray().Select(s => new StepDto(s.GetProperty("raw").GetString()!, s.GetProperty("status").GetString()!, s.GetProperty("duration").GetInt32(),
                s.TryGetProperty("error", out var error) ? error.GetString() : null, s.TryGetProperty("screenshot", out var screenshot) ? ArtifactUrl(screenshot.GetString()) : null)).ToList();
            return new ResultDto(r.Id, r.TestId, r.TestName, r.Status.ToString().ToLowerInvariant(), r.DurationMs, r.ErrorMessage, r.FailedStep, r.Order, ArtifactUrl(r.ScreenshotPath), list, r.SkipReason);
        }).ToList();
        return new(run.Id, run.Status.ToString().ToLowerInvariant(), run.Environment, run.TotalTests, run.PassedTests, run.FailedTests,
            run.DurationMs, run.FileName ?? run.TestSuite?.Name, run.TriggeredBy, run.StartedAt, run.CompletedAt, output, run.ErrorMessage);
    }
}
