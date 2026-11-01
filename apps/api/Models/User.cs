namespace Axtest.Api.Models;

public class User
{
    public long Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsDisabled { get; set; }
    public int FailedLogins { get; set; }
    public DateTime? LockedUntil { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WorkspaceMember> Memberships { get; set; } = [];
}
