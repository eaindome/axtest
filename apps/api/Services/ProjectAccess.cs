using System.Security.Claims;
using Axtest.Api.Data;
using Axtest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Services;

public class ProjectAccess(AppDbContext db, IHttpContextAccessor http)
{
    public long UserId => long.Parse(http.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    public Task<Project?> Get(long projectId, bool write = false, bool allowArchived = false) => db.Projects.FirstOrDefaultAsync(p =>
        p.Id == projectId && (!write || allowArchived || p.ArchivedAt == null) && p.Workspace.Members.Any(m => m.UserId == UserId && (!write || m.Role != WorkspaceRole.Viewer)));
    // Serialize lifecycle changes and run submission for a project across API instances.
    public async Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> Lock(long projectId) {
        var transaction = await db.Database.BeginTransactionAsync();
        try {
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT \"Id\" FROM \"Projects\" WHERE \"Id\" = {projectId} FOR UPDATE");
            return transaction;
        } catch { await transaction.DisposeAsync(); throw; }
    }
    public Task<bool> Workspace(long workspaceId, bool write = false) => db.WorkspaceMembers.AnyAsync(m =>
        m.WorkspaceId == workspaceId && m.UserId == UserId && (!write || m.Role != WorkspaceRole.Viewer));
}
