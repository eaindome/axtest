using System.Security.Claims;
using System.Text;
using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Models;
using Axtest.Api.Services;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Controllers;
[ApiController, Route("api/auth"), RequestSizeLimit(16384)]
public class AuthController(AppDbContext db, SessionService sessions, IAntiforgery antiforgery) : ControllerBase
{
    // Equal-cost hash check for unknown usernames prevents a cheap account-existence timing signal.
    private static readonly string DummyHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString(), 12);
    private SessionResponse ResponseFor(User? user, DateTime? expiry = null) => new(
        user is null ? null : new UserDto(user.Id, user.Name, user.Username, user.CreatedAt),
        antiforgery.GetAndStoreTokens(HttpContext).RequestToken!, expiry);
    [HttpGet("session"), AllowAnonymous]
    public async Task<IActionResult> Session()
    {
        Response.Headers.CacheControl = "no-store";
        if (User.Identity?.IsAuthenticated != true) return Ok(ResponseFor(null));
        var id = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FindAsync(id);
        return Ok(ResponseFor(user));
    }
    [HttpPost("register"), AllowAnonymous, EnableRateLimiting("auth")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        if (Encoding.UTF8.GetByteCount(req.Password) > 72) return BadRequest("Password must fit within 72 UTF-8 bytes.");
        var username = req.Username.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Username == username)) return Conflict("Username is unavailable.");
        var user = new User { Name = req.Name.Trim(), Username = username, PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, 12) };
        if (user.Name.Length < 2) return BadRequest("A name is required.");
        var workspace = new Workspace { Name = string.IsNullOrWhiteSpace(req.WorkspaceName) ? user.Name + "'s workspace" : req.WorkspaceName.Trim() };
        db.WorkspaceMembers.Add(new WorkspaceMember { User = user, Workspace = workspace, Role = WorkspaceRole.Owner });
        await db.SaveChangesAsync();
        return Ok(ResponseFor(user, await sessions.SignIn(HttpContext, user)));
    }
    [HttpPost("login"), AllowAnonymous, EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var username = req.Username.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username);
        var valid = Encoding.UTF8.GetByteCount(req.Password) <= 72 && BCrypt.Net.BCrypt.Verify(req.Password, user?.PasswordHash ?? DummyHash);
        if (user is null || user.IsDisabled || !valid || user.LockedUntil > DateTime.UtcNow)
        {
            if (user is not null && user.LockedUntil.GetValueOrDefault() <= DateTime.UtcNow)
                await db.Users.Where(u => u.Id == user.Id).ExecuteUpdateAsync(set => set
                    .SetProperty(u => u.FailedLogins, u => u.FailedLogins + 1)
                    .SetProperty(u => u.LockedUntil, u => u.FailedLogins >= 4 ? DateTime.UtcNow.AddMinutes(15) : u.LockedUntil));
            return Unauthorized(new { error = "Invalid username or password." });
        }
        user.FailedLogins = 0; user.LockedUntil = null;
        await db.SaveChangesAsync();
        return Ok(ResponseFor(user, await sessions.SignIn(HttpContext, user)));
    }
    [HttpPost("logout"), Authorize]
    public async Task<IActionResult> Logout()
    {
        await sessions.Revoke(HttpContext);
        await HttpContext.SignOutAsync(SessionService.Scheme);
        HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity());
        return Ok(ResponseFor(null));
    }
    [HttpPost("change-password"), Authorize, EnableRateLimiting("auth")]
    public async Task<IActionResult> ChangePassword(PasswordRequest req)
    {
        var id = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.SingleAsync(u => u.Id == id);
        if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash)) return BadRequest("Current password is incorrect.");
        if (Encoding.UTF8.GetByteCount(req.NewPassword) > 72) return BadRequest("Password must fit within 72 UTF-8 bytes.");
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword, 12);
        user.FailedLogins = 0; user.LockedUntil = null;
        await db.UserSessions.Where(s => s.UserId == id).ExecuteDeleteAsync();
        await db.SaveChangesAsync();
        return Ok(ResponseFor(user, await sessions.SignIn(HttpContext, user)));
    }
}
