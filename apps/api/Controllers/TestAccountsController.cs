using System.Text.Json;
using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Models;
using Axtest.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Controllers;
[ApiController, Authorize, Route("api/projects/{projectId:long}/test-accounts"), RequestSizeLimit(32768)]
public class TestAccountsController(AppDbContext db, ProjectAccess access, TestAccountSecrets secrets) : ControllerBase
{
    private static TestAccountDto Dto(ProjectTestAccount a) => new(a.Id, a.Name, a.Environment, a.TargetUrl, JsonSerializer.Deserialize<string[]>(a.VariableNamesJson)!, a.UpdatedAt);
    [HttpGet]
    public async Task<IActionResult> List(long projectId) {
        if (await access.Get(projectId) is null) return NotFound();
        return Ok((await db.ProjectTestAccounts.Where(a => a.ProjectId == projectId).OrderBy(a => a.Name).ToListAsync()).Select(Dto));
    }
    [HttpPost]
    public async Task<IActionResult> Create(long projectId, SaveTestAccountRequest req) {
        var project = await access.Get(projectId, true);
        if (project is null) return NotFound();
        if (req.Name.Trim().Length < 2) return BadRequest("Enter an account name.");
        var account = new ProjectTestAccount { ProjectId = projectId, Name = req.Name.Trim(), Environment = req.Environment, TargetUrl = await secrets.Url(project, req.Environment) };
        secrets.Protect(account, req.Variables);
        db.ProjectTestAccounts.Add(account); await db.SaveChangesAsync();
        return Ok(Dto(account));
    }
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(long projectId, Guid id) {
        if (await access.Get(projectId, true) is null) return NotFound();
        var account = await db.ProjectTestAccounts.SingleOrDefaultAsync(a => a.ProjectId == projectId && a.Id == id);
        if (account is null) return NotFound();
        db.ProjectTestAccounts.Remove(account); await db.SaveChangesAsync(); return NoContent();
    }
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(long projectId, Guid id, SaveTestAccountRequest req) {
        var project = await access.Get(projectId, true);
        if (project is null) return NotFound();
        var account = await db.ProjectTestAccounts.SingleOrDefaultAsync(a => a.ProjectId == projectId && a.Id == id);
        if (account is null) return NotFound();
        if (req.Environment != account.Environment) return BadRequest("Accounts cannot be moved between environments.");
        account.Name = req.Name.Trim();
        if (account.Name.Length < 2) return BadRequest("Enter an account name.");
        secrets.Update(account, req.Variables, await secrets.Url(project, req.Environment));
        await db.SaveChangesAsync();
        return Ok(Dto(account));
    }
}
