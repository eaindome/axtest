using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Axtest.Api.Data;
using Axtest.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Axtest.Api.Services;

public class DevelopmentIdentity(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger,
    UrlEncoder encoder, AppDbContext db) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "LocalDevelopment";
    public const string Email = "developer@axtest.local";
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var address = Context.Connection.RemoteIpAddress;
        if (address is null || !IPAddress.IsLoopback(address)) return AuthenticateResult.Fail("Development access is loopback-only.");
        var user = await db.Users.SingleAsync(u => u.Email == Email);
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Name, user.Name) };
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName)), SchemeName));
    }

    public static async Task Seed(AppDbContext db)
    {
        if (await db.Users.AnyAsync(u => u.Email == Email)) return;
        var user = new User { Name = "Developer", Email = Email, PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()) };
        var workspace = new Workspace { Name = "Development workspace" };
        db.WorkspaceMembers.Add(new WorkspaceMember { User = user, Workspace = workspace, Role = WorkspaceRole.Owner });
        await db.SaveChangesAsync();
    }
}
