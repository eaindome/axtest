using System.Security.Claims;
using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:long}/environments")]
[Authorize]
public class EnvironmentsController(AppDbContext db) : ControllerBase
{
    private static readonly HashSet<string> AllowedNames = ["staging", "local"];

    private long UserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<Project?> GetProjectIfMember(long projectId) =>
        await db.Projects
            .Include(p => p.Workspace)
            .Where(p => p.Id == projectId && p.Workspace.Members.Any(m => m.UserId == UserId))
            .FirstOrDefaultAsync();

    [HttpGet]
    public async Task<ActionResult<List<EnvironmentDto>>> List(long projectId)
    {
        var project = await GetProjectIfMember(projectId);
        if (project is null) return NotFound();

        var overrides = await db.ProjectEnvironments
            .Where(e => e.ProjectId == projectId)
            .ToListAsync();

        return Ok(BuildList(project, overrides));
    }

    [HttpPut("{name}")]
    public async Task<ActionResult<List<EnvironmentDto>>> Upsert(long projectId, string name, UpsertEnvironmentRequest req)
    {
        if (!AllowedNames.Contains(name))
            return BadRequest("Only staging and local environments can be configured. Production uses the project base URL.");

        var project = await GetProjectIfMember(projectId);
        if (project is null) return NotFound();

        if (!req.UseProductionFallback && string.IsNullOrWhiteSpace(req.BaseUrl))
            return BadRequest("Provide a base URL or set UseProductionFallback to true.");

        var env = await db.ProjectEnvironments
            .FirstOrDefaultAsync(e => e.ProjectId == projectId && e.Name == name);

        if (env is null)
        {
            env = new ProjectEnvironment
            {
                ProjectId = projectId,
                Name = name,
            };
            db.ProjectEnvironments.Add(env);
        }

        env.BaseUrl = req.UseProductionFallback ? null : req.BaseUrl?.Trim();
        env.UseProductionFallback = req.UseProductionFallback;
        env.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        var overrides = await db.ProjectEnvironments
            .Where(e => e.ProjectId == projectId)
            .ToListAsync();

        return Ok(BuildList(project, overrides));
    }

    [HttpDelete("{name}")]
    public async Task<IActionResult> Delete(long projectId, string name)
    {
        if (!AllowedNames.Contains(name))
            return BadRequest("Only staging and local environment overrides can be removed.");

        var project = await GetProjectIfMember(projectId);
        if (project is null) return NotFound();

        var env = await db.ProjectEnvironments
            .FirstOrDefaultAsync(e => e.ProjectId == projectId && e.Name == name);

        if (env is null) return NoContent();

        db.ProjectEnvironments.Remove(env);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static List<EnvironmentDto> BuildList(Project project, List<ProjectEnvironment> overrides)
    {
        var list = new List<EnvironmentDto>
        {
            new("production", project.BaseUrl, false, project.BaseUrl ?? "", true),
        };

        foreach (var name in AllowedNames)
        {
            var env = overrides.FirstOrDefault(e => e.Name == name);
            if (env is null)
            {
                list.Add(new EnvironmentDto(name, null, false, project.BaseUrl ?? "", false));
            }
            else
            {
                list.Add(ToDto(project, env));
            }
        }

        return list;
    }

    private static EnvironmentDto ToDto(Project project, ProjectEnvironment env) =>
        new(
            env.Name,
            env.BaseUrl,
            env.UseProductionFallback,
            env.UseProductionFallback || string.IsNullOrWhiteSpace(env.BaseUrl)
                ? project.BaseUrl ?? ""
                : env.BaseUrl!,
            true
        );
}
