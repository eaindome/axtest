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
public class ProjectsController(AppDbContext db, Axtest.Api.Services.ExplorerService explorer, Axtest.Api.Services.RunnerProcess runner, Axtest.Api.Services.ProjectAccess access) : ControllerBase
{
    private long UserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> IsMember(long workspaceId) =>
        await db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId && (HttpMethods.IsGet(Request.Method) || m.Role != WorkspaceRole.Viewer));

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
                p.CreatedAt, p.UpdatedAt, p.ArchivedAt))
            .ToListAsync();

        return Ok(projects);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> Create(long workspaceId, CreateProjectRequest req)
    {
        if (!await IsMember(workspaceId)) return NotFound();

        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Project name is required.");
        if (!string.IsNullOrWhiteSpace(req.BaseUrl) && (!Uri.TryCreate(req.BaseUrl, UriKind.Absolute, out var url) || url.Scheme is not ("http" or "https"))) return BadRequest("Project URL must use HTTP or HTTPS.");
        var project = new Project
        {
            WorkspaceId = workspaceId,
            Name        = req.Name.Trim(),
            BaseUrl     = req.BaseUrl?.Trim(),
            Description = req.Description?.Trim(),
        };

        await using var transaction = await db.Database.BeginTransactionAsync();
        db.Projects.Add(project);
        await db.SaveChangesAsync();

        await explorer.EnsureFolders(project.Id, "auth");
        await explorer.EnsureFolders(project.Id, "modules");
        await explorer.Save(project.Id);
        await transaction.CommitAsync();
        return CreatedAtAction(nameof(Get), new { workspaceId, id = project.Id },
            new ProjectDto(project.Id, project.Name, project.BaseUrl, project.Description, 0, 0, project.CreatedAt, project.UpdatedAt, project.ArchivedAt));
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
                p.CreatedAt, p.UpdatedAt, p.ArchivedAt))
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
        if (project.ArchivedAt is not null) return Conflict("Restore this project before editing its details.");

        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Project name is required.");
        if (!string.IsNullOrWhiteSpace(req.BaseUrl) && (!Uri.TryCreate(req.BaseUrl, UriKind.Absolute, out var url) || url.Scheme is not ("http" or "https"))) return BadRequest("Project URL must use HTTP or HTTPS.");
        project.Name        = req.Name.Trim();
        project.BaseUrl     = req.BaseUrl?.Trim();
        project.Description = req.Description?.Trim();
        project.UpdatedAt   = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new ProjectDto(project.Id, project.Name, project.BaseUrl, project.Description,
            project.TestRuns.Count, project.Systems.Count, project.CreatedAt, project.UpdatedAt, project.ArchivedAt));
    }

    [HttpPost("{id:long}/archive")]
    public async Task<IActionResult> Archive(long workspaceId, long id) {
        if (!await IsMember(workspaceId)) return NotFound();
        await using var transaction = await access.Lock(id);
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id && p.WorkspaceId == workspaceId);
        if (project is null) return NotFound();
        if (await db.TestRuns.AnyAsync(r => r.ProjectId == id && (r.Status == RunStatus.Pending || r.Status == RunStatus.Running))) return Conflict("Wait for active runs before archiving this project.");
        project.ArchivedAt ??= DateTime.UtcNow;
        project.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return NoContent();
    }

    [HttpPost("{id:long}/restore")]
    public async Task<IActionResult> Restore(long workspaceId, long id) {
        if (!await IsMember(workspaceId)) return NotFound();
        await using var transaction = await access.Lock(id);
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id && p.WorkspaceId == workspaceId);
        if (project is null) return NotFound();
        project.ArchivedAt = null;
        project.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long workspaceId, long id)
    {
        if (!await IsMember(workspaceId)) return NotFound();

        await using var transaction = await access.Lock(id);
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id && p.WorkspaceId == workspaceId);
        if (project is null) return NotFound();
        if (project.ArchivedAt is null) return Conflict("Archive the project before permanently deleting it.");

        if (await db.TestRuns.AnyAsync(r => r.ProjectId == id && (r.Status == RunStatus.Pending || r.Status == RunStatus.Running))) return Conflict("Wait for active runs before deleting this project.");
        var runIds = await db.TestRuns.Where(r => r.ProjectId == id).Select(r => r.Id).ToListAsync();
        db.Projects.Remove(project);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        foreach (var runId in runIds) runner.RemoveArtifacts(runId);
        return NoContent();
    }
}
