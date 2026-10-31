namespace Axtest.Api.Models;

public class ProjectFile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public long ProjectId { get; set; }
    public string Path { get; set; } = "";
    public bool IsFolder { get; set; }
    public string Content { get; set; } = "";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Project Project { get; set; } = null!;
}
