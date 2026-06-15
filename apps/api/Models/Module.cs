namespace Axtest.Api.Models;

public class Module
{
    public long Id { get; set; }
    public long SystemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public AppSystem System { get; set; } = null!;
    public ICollection<TestSuite> TestSuites { get; set; } = [];
}
