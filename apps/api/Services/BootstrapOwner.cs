using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Axtest.Api.Data;
using Axtest.Api.Models;
using Microsoft.EntityFrameworkCore;
namespace Axtest.Api.Services;

// Explicit one-time CLI operation. The password is supplied over stdin, never in an argument or a source file.
public static class BootstrapOwner
{
    private record Input(string Username, string Password, string Name);
    public static async Task Create(AppDbContext db)
    {
        Console.WriteLine("Ready for bootstrap JSON on stdin.");
        var input = JsonSerializer.Deserialize<Input>(await Console.In.ReadLineAsync() ?? "", new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
        var username = input.Username.Trim().ToLowerInvariant();
        if (!Regex.IsMatch(username, @"^[a-z0-9_.-]{3,32}$") || input.Password.Length < 12 || Encoding.UTF8.GetByteCount(input.Password) > 72)
            throw new ArgumentException("Invalid bootstrap username or password length.");
        if (await db.Users.AnyAsync(u => u.Username == username)) { Console.WriteLine("Account already exists; its password was not changed."); return; }
        await using var tx = await db.Database.BeginTransactionAsync();
        var owner = new User { Username = username, Name = input.Name.Trim(), PasswordHash = BCrypt.Net.BCrypt.HashPassword(input.Password, 12) };
        db.Users.Add(owner);
        var legacy = await db.Users.Include(u => u.Memberships).ThenInclude(m => m.Workspace).FirstOrDefaultAsync(u => u.Email == "developer@axtest.local");
        if (legacy?.Memberships.Count > 0)
        {
            foreach (var membership in legacy.Memberships.ToList())
            {
                db.WorkspaceMembers.Add(new WorkspaceMember { User = owner, Workspace = membership.Workspace, Role = WorkspaceRole.Owner });
                db.WorkspaceMembers.Remove(membership);
            }
            legacy.IsDisabled = true;
        }
        else db.WorkspaceMembers.Add(new WorkspaceMember { User = owner, Workspace = new Workspace { Name = owner.Name + "'s workspace" }, Role = WorkspaceRole.Owner });
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        Console.WriteLine("Owner account created; the password was stored only as a BCrypt hash.");
    }
}
