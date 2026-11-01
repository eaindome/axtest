namespace Axtest.Api.Models;

public class ProjectTestAccount
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public long ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Environment { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public string VariableNamesJson { get; set; } = "[]";
    public string ProtectedValues { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Project Project { get; set; } = null!;
}
