using System.Security.Claims;
using Axtest.Api.Data;
using Axtest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Services;

public class ProjectAccess(AppDbContext db, IHttpContextAccessor http)
{
    public long UserId => long.Parse(http.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    public Task<Project?> Get(long projectId, bool write = false) => db.Projects.FirstOrDefaultAsync(p =>
        p.Id == projectId && p.Workspace.Members.Any(m => m.UserId == UserId && (!write || m.Role != WorkspaceRole.Viewer)));
    public Task<bool> Workspace(long workspaceId, bool write = false) => db.WorkspaceMembers.AnyAsync(m =>
        m.WorkspaceId == workspaceId && m.UserId == UserId && (!write || m.Role != WorkspaceRole.Viewer));
}
