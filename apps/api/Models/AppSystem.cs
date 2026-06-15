using System.ComponentModel.DataAnnotations.Schema;

namespace Axtest.Api.Models;

[Table("Systems")]
public class AppSystem
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? BaseUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Project Project { get; set; } = null!;
    public ICollection<Module> Modules { get; set; } = [];
}
