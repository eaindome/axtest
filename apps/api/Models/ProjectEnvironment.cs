namespace Axtest.Api.Models;

public class ProjectEnvironment
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    /// <summary>staging or local — production always uses Project.BaseUrl.</summary>
    public string Name { get; set; } = string.Empty;
    public string? BaseUrl { get; set; }
    /// <summary>User chose to inherit production URL for this environment.</summary>
    public bool UseProductionFallback { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Project Project { get; set; } = null!;
}
