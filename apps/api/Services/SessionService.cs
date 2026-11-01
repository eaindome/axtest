using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Axtest.Api.Data;
using Axtest.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.WebUtilities;

namespace Axtest.Api.Services;
public class SessionService(AppDbContext db)
{
    public const string Scheme = CookieAuthenticationDefaults.AuthenticationScheme;
    public static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    public async Task<DateTime> SignIn(HttpContext context, User user)
    {
        await Revoke(context);
        await db.UserSessions.Where(s => s.ExpiresAt < DateTime.UtcNow).ExecuteDeleteAsync();
        var secret = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        var expiry = DateTime.UtcNow.AddHours(8);
        db.UserSessions.Add(new UserSession { Id = Hash(secret), UserId = user.Id, ExpiresAt = expiry });
        await db.SaveChangesAsync();
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Name, user.Username), new Claim("sid", secret)
        }, Scheme));
        await context.SignInAsync(Scheme, principal, new AuthenticationProperties { ExpiresUtc = expiry, IsPersistent = false });
        context.User = principal;
        return expiry;
    }
    public async Task Revoke(HttpContext context)
    {
        var secret = context.User.FindFirstValue("sid");
        if (secret is not null) await db.UserSessions.Where(s => s.Id == Hash(secret)).ExecuteDeleteAsync();
    }
    public static async Task Validate(CookieValidatePrincipalContext context)
    {
        var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
        var secret = context.Principal?.FindFirstValue("sid");
        var id = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (secret is null || !long.TryParse(id, out var userId) || !await db.UserSessions.AnyAsync(s =>
            s.Id == Hash(secret) && s.UserId == userId && s.ExpiresAt > DateTime.UtcNow && !s.User.IsDisabled))
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(Scheme);
        }
    }
}
