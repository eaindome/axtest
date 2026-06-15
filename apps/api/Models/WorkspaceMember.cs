namespace Axtest.Api.Models;

public enum WorkspaceRole { Owner, Admin, Member, Viewer }

public class WorkspaceMember
{
    public long Id { get; set; }
    public long WorkspaceId { get; set; }
    public long UserId { get; set; }
    public WorkspaceRole Role { get; set; } = WorkspaceRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Workspace Workspace { get; set; } = null!;
    public User User { get; set; } = null!;
}
