using System.Security.Claims;
using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Controllers;

[ApiController]
[Route("api/workspaces/{workspaceId:long}/projects")]
[Authorize]
public class ProjectsController(AppDbContext db) : ControllerBase
{
    private long UserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> IsMember(long workspaceId) =>
        await db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId);

    [HttpGet]
    public async Task<ActionResult<List<ProjectDto>>> List(long workspaceId)
    {
        if (!await IsMember(workspaceId)) return NotFound();

        var projects = await db.Projects
            .Where(p => p.WorkspaceId == workspaceId)
            .OrderByDescending(p => p.UpdatedAt)
            .Select(p => new ProjectDto(
                p.Id, p.Name, p.BaseUrl, p.Description,
                p.TestRuns.Count, p.Systems.Count,
                p.CreatedAt, p.UpdatedAt))
            .ToListAsync();

        return Ok(projects);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> Create(long workspaceId, CreateProjectRequest req)
    {
        if (!await IsMember(workspaceId)) return NotFound();

        var project = new Project
        {
            WorkspaceId = workspaceId,
            Name        = req.Name.Trim(),
            BaseUrl     = req.BaseUrl?.Trim(),
            Description = req.Description?.Trim(),
        };

        db.Projects.Add(project);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { workspaceId, id = project.Id },
            new ProjectDto(project.Id, project.Name, project.BaseUrl, project.Description, 0, 0, project.CreatedAt, project.UpdatedAt));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ProjectDto>> Get(long workspaceId, long id)
    {
        if (!await IsMember(workspaceId)) return NotFound();

        var project = await db.Projects
            .Where(p => p.Id == id && p.WorkspaceId == workspaceId)
            .Select(p => new ProjectDto(
                p.Id, p.Name, p.BaseUrl, p.Description,
                p.TestRuns.Count, p.Systems.Count,
                p.CreatedAt, p.UpdatedAt))
            .FirstOrDefaultAsync();

        return project is null ? NotFound() : Ok(project);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ProjectDto>> Update(long workspaceId, long id, UpdateProjectRequest req)
    {
        if (!await IsMember(workspaceId)) return NotFound();

        var project = await db.Projects
            .Include(p => p.Systems)
            .Include(p => p.TestRuns)
            .FirstOrDefaultAsync(p => p.Id == id && p.WorkspaceId == workspaceId);
        if (project is null) return NotFound();

        project.Name        = req.Name.Trim();
        project.BaseUrl     = req.BaseUrl?.Trim();
        project.Description = req.Description?.Trim();
        project.UpdatedAt   = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new ProjectDto(project.Id, project.Name, project.BaseUrl, project.Description,
            project.TestRuns.Count, project.Systems.Count, project.CreatedAt, project.UpdatedAt));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long workspaceId, long id)
    {
        if (!await IsMember(workspaceId)) return NotFound();

        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id && p.WorkspaceId == workspaceId);
        if (project is null) return NotFound();

        db.Projects.Remove(project);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
