using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Models;
using Axtest.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, TokenService tokens) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email.ToLower()))
            return Conflict(new { error = "Email already registered" });

        var user = new User
        {
            Name         = req.Name.Trim(),
            Email        = req.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
        };

        var workspace = new Workspace { Name = req.WorkspaceName.Trim() };
        var membership = new WorkspaceMember
        {
            User      = user,
            Workspace = workspace,
            Role      = WorkspaceRole.Owner,
        };

        db.Users.Add(user);
        db.Workspaces.Add(workspace);
        db.WorkspaceMembers.Add(membership);
        await db.SaveChangesAsync();

        var workspaceDto = new WorkspaceDto(workspace.Id, workspace.Name, 1, 0, workspace.CreatedAt);
        return Ok(new AuthResponse(tokens.Generate(user), ToDto(user), [workspaceDto]));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var user = await db.Users
            .Include(u => u.Memberships)
                .ThenInclude(m => m.Workspace)
                    .ThenInclude(w => w.Projects)
            .Include(u => u.Memberships)
                .ThenInclude(m => m.Workspace)
                    .ThenInclude(w => w.Members)
            .FirstOrDefaultAsync(u => u.Email == req.Email.ToLower());

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid email or password" });

        var workspaces = user.Memberships.Select(m => new WorkspaceDto(
            m.Workspace.Id, m.Workspace.Name,
            m.Workspace.Members.Count, m.Workspace.Projects.Count,
            m.Workspace.CreatedAt)).ToList();

        return Ok(new AuthResponse(tokens.Generate(user), ToDto(user), workspaces));
    }

    private static UserDto ToDto(User u) => new(u.Id, u.Name, u.Email, u.CreatedAt);
}
