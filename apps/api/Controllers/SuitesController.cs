using System.Security.Claims;
using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Controllers;

[ApiController]
[Route("api/modules/{moduleId:long}/suites")]
[Authorize]
public class SuitesController(AppDbContext db) : ControllerBase
{
    private long UserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> CanAccessModule(long moduleId) =>
        await db.Modules
            .Where(m => m.Id == moduleId)
            .AnyAsync(m => m.System.Project.Workspace.Members.Any(wm => wm.UserId == UserId));

    [HttpGet]
    public async Task<ActionResult<List<SuiteListDto>>> List(long moduleId)
    {
        if (!await CanAccessModule(moduleId)) return NotFound();

        var suites = await db.TestSuites
            .Where(s => s.ModuleId == moduleId)
            .OrderByDescending(s => s.UpdatedAt)
            .Select(s => new SuiteListDto(s.Id, s.Name, s.TestRuns.Count, s.CreatedAt, s.UpdatedAt))
            .ToListAsync();

        return Ok(suites);
    }

    [HttpPost]
    public async Task<ActionResult<SuiteDetailDto>> Create(long moduleId, CreateSuiteRequest req)
    {
        if (!await CanAccessModule(moduleId)) return NotFound();

        var suite = new TestSuite
        {
            ModuleId = moduleId,
            Name     = req.Name.Trim(),
            Content  = req.Content,
        };

        db.TestSuites.Add(suite);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { moduleId, id = suite.Id }, ToDetail(suite, 0));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<SuiteDetailDto>> Get(long moduleId, long id)
    {
        if (!await CanAccessModule(moduleId)) return NotFound();

        var suite = await db.TestSuites
            .Where(s => s.Id == id && s.ModuleId == moduleId)
            .Select(s => new SuiteDetailDto(
                s.Id, s.Name, s.Content,
                s.TestRuns.Count, s.CreatedAt, s.UpdatedAt))
            .FirstOrDefaultAsync();

        return suite is null ? NotFound() : Ok(suite);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<SuiteDetailDto>> Update(long moduleId, long id, UpdateSuiteRequest req)
    {
        if (!await CanAccessModule(moduleId)) return NotFound();

        var suite = await db.TestSuites.FirstOrDefaultAsync(s => s.Id == id && s.ModuleId == moduleId);
        if (suite is null) return NotFound();

        suite.Name      = req.Name.Trim();
        suite.Content   = req.Content;
        suite.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(ToDetail(suite, 0));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long moduleId, long id)
    {
        if (!await CanAccessModule(moduleId)) return NotFound();

        var suite = await db.TestSuites.FirstOrDefaultAsync(s => s.Id == id && s.ModuleId == moduleId);
        if (suite is null) return NotFound();

        db.TestSuites.Remove(suite);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static SuiteDetailDto ToDetail(TestSuite s, int runCount) =>
        new(s.Id, s.Name, s.Content, runCount, s.CreatedAt, s.UpdatedAt);
}
