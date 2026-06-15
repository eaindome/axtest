using System.Security.Claims;
using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Controllers;

[ApiController]
[Route("api/workspaces")]
[Authorize]
public class WorkspacesController(AppDbContext db) : ControllerBase
{
    private long UserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<WorkspaceMember?> GetMembership(long workspaceId) =>
        await db.WorkspaceMembers.FirstOrDefaultAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId);

    [HttpGet]
    public async Task<ActionResult<List<WorkspaceDto>>> List()
    {
        var workspaces = await db.WorkspaceMembers
            .Where(m => m.UserId == UserId)
            .Select(m => new WorkspaceDto(
                m.Workspace.Id, m.Workspace.Name,
                m.Workspace.Members.Count, m.Workspace.Projects.Count,
                m.Workspace.CreatedAt))
            .ToListAsync();

        return Ok(workspaces);
    }

    [HttpPost]
    public async Task<ActionResult<WorkspaceDto>> Create(CreateWorkspaceRequest req)
    {
        var workspace = new Workspace { Name = req.Name.Trim() };
        var membership = new WorkspaceMember
        {
            WorkspaceId = workspace.Id,
            UserId      = UserId,
            Role        = WorkspaceRole.Owner,
        };

        db.Workspaces.Add(workspace);
        db.WorkspaceMembers.Add(membership);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = workspace.Id },
            new WorkspaceDto(workspace.Id, workspace.Name, 1, 0, workspace.CreatedAt));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<WorkspaceDto>> Get(long id)
    {
        var dto = await db.WorkspaceMembers
            .Where(m => m.WorkspaceId == id && m.UserId == UserId)
            .Select(m => new WorkspaceDto(
                m.Workspace.Id, m.Workspace.Name,
                m.Workspace.Members.Count, m.Workspace.Projects.Count,
                m.Workspace.CreatedAt))
            .FirstOrDefaultAsync();

        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<WorkspaceDto>> Update(long id, UpdateWorkspaceRequest req)
    {
        var membership = await GetMembership(id);
        if (membership is null) return NotFound();
        if (membership.Role is not (WorkspaceRole.Owner or WorkspaceRole.Admin))
            return Forbid();

        var workspace = await db.Workspaces.Include(w => w.Members).Include(w => w.Projects)
            .FirstOrDefaultAsync(w => w.Id == id);
        if (workspace is null) return NotFound();

        workspace.Name      = req.Name.Trim();
        workspace.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new WorkspaceDto(workspace.Id, workspace.Name,
            workspace.Members.Count, workspace.Projects.Count, workspace.CreatedAt));
    }

    [HttpGet("{id:long}/members")]
    public async Task<ActionResult<List<WorkspaceMemberDto>>> ListMembers(long id)
    {
        if (await GetMembership(id) is null) return NotFound();

        var members = await db.WorkspaceMembers
            .Where(m => m.WorkspaceId == id)
            .Select(m => new WorkspaceMemberDto(
                m.Id, m.UserId, m.User.Name, m.User.Email,
                m.Role.ToString().ToLower(), m.JoinedAt))
            .ToListAsync();

        return Ok(members);
    }

    [HttpPost("{id:long}/members")]
    public async Task<ActionResult<WorkspaceMemberDto>> InviteMember(long id, InviteMemberRequest req)
    {
        var membership = await GetMembership(id);
        if (membership is null) return NotFound();
        if (membership.Role is not (WorkspaceRole.Owner or WorkspaceRole.Admin))
            return Forbid();

        var targetUser = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower());
        if (targetUser is null)
            return NotFound(new { error = "No user found with that email address" });

        var alreadyMember = await db.WorkspaceMembers
            .AnyAsync(m => m.WorkspaceId == id && m.UserId == targetUser.Id);
        if (alreadyMember)
            return Conflict(new { error = "User is already a member of this workspace" });

        if (!Enum.TryParse<WorkspaceRole>(req.Role, ignoreCase: true, out var role))
            role = WorkspaceRole.Member;

        var newMember = new WorkspaceMember
        {
            WorkspaceId = id,
            UserId      = targetUser.Id,
            Role        = role,
        };

        db.WorkspaceMembers.Add(newMember);
        await db.SaveChangesAsync();

        return Ok(new WorkspaceMemberDto(
            newMember.Id, targetUser.Id, targetUser.Name, targetUser.Email,
            newMember.Role.ToString().ToLower(), newMember.JoinedAt));
    }

    [HttpDelete("{id:long}/members/{memberId:long}")]
    public async Task<IActionResult> RemoveMember(long id, long memberId)
    {
        var callerMembership = await GetMembership(id);
        if (callerMembership is null) return NotFound();
        if (callerMembership.Role is not (WorkspaceRole.Owner or WorkspaceRole.Admin))
            return Forbid();

        var target = await db.WorkspaceMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.WorkspaceId == id);
        if (target is null) return NotFound();
        if (target.Role == WorkspaceRole.Owner)
            return BadRequest(new { error = "Cannot remove the workspace owner" });

        db.WorkspaceMembers.Remove(target);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
