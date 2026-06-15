using System.Security.Claims;
using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Controllers;

[ApiController]
[Route("api/systems/{systemId:long}/modules")]
[Authorize]
public class ModulesController(AppDbContext db) : ControllerBase
{
    private long UserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> CanAccessSystem(long systemId) =>
        await db.Systems
            .Where(s => s.Id == systemId)
            .AnyAsync(s => s.Project.Workspace.Members.Any(m => m.UserId == UserId));

    [HttpGet]
    public async Task<ActionResult<List<ModuleListDto>>> List(long systemId)
    {
        if (!await CanAccessSystem(systemId)) return NotFound();

        var modules = await db.Modules
            .Where(m => m.SystemId == systemId)
            .OrderBy(m => m.Name)
            .Select(m => new ModuleListDto(
                m.Id, m.Name, m.Description, m.TestSuites.Count,
                m.CreatedAt, m.UpdatedAt))
            .ToListAsync();

        return Ok(modules);
    }

    [HttpPost]
    public async Task<ActionResult<ModuleDetailDto>> Create(long systemId, CreateModuleRequest req)
    {
        if (!await CanAccessSystem(systemId)) return NotFound();

        var module = new Module
        {
            SystemId    = systemId,
            Name        = req.Name.Trim(),
            Description = req.Description?.Trim(),
        };

        db.Modules.Add(module);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { systemId, id = module.Id },
            new ModuleDetailDto(module.Id, module.Name, module.Description, 0, module.CreatedAt, module.UpdatedAt));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ModuleDetailDto>> Get(long systemId, long id)
    {
        if (!await CanAccessSystem(systemId)) return NotFound();

        var module = await db.Modules
            .Where(m => m.Id == id && m.SystemId == systemId)
            .Select(m => new ModuleDetailDto(
                m.Id, m.Name, m.Description, m.TestSuites.Count,
                m.CreatedAt, m.UpdatedAt))
            .FirstOrDefaultAsync();

        return module is null ? NotFound() : Ok(module);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ModuleDetailDto>> Update(long systemId, long id, UpdateModuleRequest req)
    {
        if (!await CanAccessSystem(systemId)) return NotFound();

        var module = await db.Modules
            .Include(m => m.TestSuites)
            .FirstOrDefaultAsync(m => m.Id == id && m.SystemId == systemId);
        if (module is null) return NotFound();

        module.Name        = req.Name.Trim();
        module.Description = req.Description?.Trim();
        module.UpdatedAt   = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new ModuleDetailDto(module.Id, module.Name, module.Description,
            module.TestSuites.Count, module.CreatedAt, module.UpdatedAt));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long systemId, long id)
    {
        if (!await CanAccessSystem(systemId)) return NotFound();

        var module = await db.Modules.FirstOrDefaultAsync(m => m.Id == id && m.SystemId == systemId);
        if (module is null) return NotFound();

        db.Modules.Remove(module);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
