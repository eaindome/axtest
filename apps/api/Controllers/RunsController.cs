using System.Security.Claims;
using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:long}/runs")]
[Authorize]
public class RunsController(AppDbContext db) : ControllerBase
{
    private long UserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> CanAccessProject(long projectId) =>
        await db.Projects
            .Where(p => p.Id == projectId)
            .AnyAsync(p => p.Workspace.Members.Any(m => m.UserId == UserId));

    [HttpPost]
    public async Task<ActionResult<RunListDto>> Submit(long projectId, SubmitRunRequest req)
    {
        if (!await CanAccessProject(projectId)) return NotFound();

        var statusEnum = (req.PassedTests == req.TotalTests && req.TotalTests > 0)
            ? RunStatus.Passed
            : RunStatus.Failed;

        var run = new TestRun
        {
            ProjectId   = projectId,
            TestSuiteId = req.TestSuiteId,
            Status      = statusEnum,
            Environment = req.Environment,
            TotalTests  = req.TotalTests,
            PassedTests = req.PassedTests,
            FailedTests = req.FailedTests,
            DurationMs  = req.DurationMs,
            TriggeredBy = req.TriggeredBy ?? "cli",
            StartedAt   = req.StartedAt,
            CompletedAt = req.CompletedAt,
        };

        db.TestRuns.Add(run);
        await db.SaveChangesAsync();

        var results = req.Results.Select((r, i) => new TestResult
        {
            RunId        = run.Id,
            TestId       = r.TestId,
            TestName     = r.TestName,
            Status       = ParseStatus(r.Status),
            DurationMs   = r.DurationMs,
            ErrorMessage = r.ErrorMessage,
            FailedStep   = r.FailedStep,
            Order        = r.Order,
        }).ToList();

        db.TestResults.AddRange(results);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { projectId, id = run.Id }, ToListDto(run, null));
    }

    [HttpGet]
    public async Task<ActionResult<List<RunListDto>>> List(long projectId, int page = 1, int pageSize = 20)
    {
        if (!await CanAccessProject(projectId)) return NotFound();

        var runs = await db.TestRuns
            .Where(r => r.ProjectId == projectId)
            .OrderByDescending(r => r.StartedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new { Run = r, SuiteName = r.TestSuite != null ? r.TestSuite.Name : null })
            .ToListAsync();

        return Ok(runs.Select(x => ToListDto(x.Run, x.SuiteName)));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<RunDetailDto>> Get(long projectId, long id)
    {
        if (!await CanAccessProject(projectId)) return NotFound();

        var run = await db.TestRuns
            .Include(r => r.TestSuite)
            .Include(r => r.Results.OrderBy(x => x.Order))
            .FirstOrDefaultAsync(r => r.Id == id && r.ProjectId == projectId);

        if (run is null) return NotFound();

        var results = run.Results.Select(r => new ResultDto(
            r.Id, r.TestId, r.TestName, r.Status.ToString().ToLower(),
            r.DurationMs, r.ErrorMessage, r.FailedStep, r.Order
        )).ToList();

        return Ok(new RunDetailDto(
            run.Id, run.Status.ToString().ToLower(), run.Environment,
            run.TotalTests, run.PassedTests, run.FailedTests, run.DurationMs,
            run.TestSuite?.Name, run.TriggeredBy,
            run.StartedAt, run.CompletedAt, results
        ));
    }

    private static RunListDto ToListDto(TestRun r, string? suiteName) => new(
        r.Id, r.Status.ToString().ToLower(), r.Environment,
        r.TotalTests, r.PassedTests, r.FailedTests, r.DurationMs,
        suiteName, r.TriggeredBy, r.StartedAt, r.CompletedAt
    );

    private static ResultStatus ParseStatus(string s) => s.ToLower() switch
    {
        "passed"  => ResultStatus.Passed,
        "failed"  => ResultStatus.Failed,
        _         => ResultStatus.Skipped,
    };
}
