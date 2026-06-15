namespace Axtest.Api.Models;

public class TestSuite
{
    public long Id { get; set; }
    public long ModuleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Module Module { get; set; } = null!;
    public ICollection<TestRun> TestRuns { get; set; } = [];
}
