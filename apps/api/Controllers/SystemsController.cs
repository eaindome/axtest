using System.Security.Claims;
using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:long}/systems")]
[Authorize]
public class SystemsController(AppDbContext db) : ControllerBase
{
    private long UserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> CanAccessProject(long projectId) =>
        await db.Projects
            .Where(p => p.Id == projectId)
            .AnyAsync(p => p.Workspace.Members.Any(m => m.UserId == UserId));

    [HttpGet]
    public async Task<ActionResult<List<SystemListDto>>> List(long projectId)
    {
        if (!await CanAccessProject(projectId)) return NotFound();

        var systems = await db.Systems
            .Where(s => s.ProjectId == projectId)
            .OrderBy(s => s.Name)
            .Select(s => new SystemListDto(
                s.Id, s.Name, s.Description, s.BaseUrl,
                s.Modules.Count, s.CreatedAt, s.UpdatedAt))
            .ToListAsync();

        return Ok(systems);
    }

    [HttpPost]
    public async Task<ActionResult<SystemDetailDto>> Create(long projectId, CreateSystemRequest req)
    {
        if (!await CanAccessProject(projectId)) return NotFound();

        var system = new AppSystem
        {
            ProjectId   = projectId,
            Name        = req.Name.Trim(),
            Description = req.Description?.Trim(),
            BaseUrl     = req.BaseUrl?.Trim(),
        };

        db.Systems.Add(system);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { projectId, id = system.Id },
            new SystemDetailDto(system.Id, system.Name, system.Description, system.BaseUrl, 0, system.CreatedAt, system.UpdatedAt));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<SystemDetailDto>> Get(long projectId, long id)
    {
        if (!await CanAccessProject(projectId)) return NotFound();

        var system = await db.Systems
            .Where(s => s.Id == id && s.ProjectId == projectId)
            .Select(s => new SystemDetailDto(
                s.Id, s.Name, s.Description, s.BaseUrl,
                s.Modules.Count, s.CreatedAt, s.UpdatedAt))
            .FirstOrDefaultAsync();

        return system is null ? NotFound() : Ok(system);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<SystemDetailDto>> Update(long projectId, long id, UpdateSystemRequest req)
    {
        if (!await CanAccessProject(projectId)) return NotFound();

        var system = await db.Systems
            .Include(s => s.Modules)
            .FirstOrDefaultAsync(s => s.Id == id && s.ProjectId == projectId);
        if (system is null) return NotFound();

        system.Name        = req.Name.Trim();
        system.Description = req.Description?.Trim();
        system.BaseUrl     = req.BaseUrl?.Trim();
        system.UpdatedAt   = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new SystemDetailDto(system.Id, system.Name, system.Description, system.BaseUrl,
            system.Modules.Count, system.CreatedAt, system.UpdatedAt));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long projectId, long id)
    {
        if (!await CanAccessProject(projectId)) return NotFound();

        var system = await db.Systems.FirstOrDefaultAsync(s => s.Id == id && s.ProjectId == projectId);
        if (system is null) return NotFound();

        db.Systems.Remove(system);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
