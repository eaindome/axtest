namespace Axtest.Api.Models;

public class Workspace
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WorkspaceMember> Members { get; set; } = [];
    public ICollection<Project> Projects { get; set; } = [];
}
