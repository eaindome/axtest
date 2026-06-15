namespace Axtest.Api.Models;

public class Project
{
    public long Id { get; set; }
    public long WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? BaseUrl { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Workspace Workspace { get; set; } = null!;
    public ICollection<AppSystem> Systems { get; set; } = [];
    public ICollection<TestRun> TestRuns { get; set; } = [];
    public ICollection<ProjectEnvironment> Environments { get; set; } = [];
}
