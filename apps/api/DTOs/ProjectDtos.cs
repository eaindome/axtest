namespace Axtest.Api.DTOs;

public record CreateProjectRequest(string Name, string? BaseUrl, string? Description);

public record UpdateProjectRequest(string Name, string? BaseUrl, string? Description);

public record ProjectDto(
    long Id,
    string Name,
    string? BaseUrl,
    string? Description,
    int RunCount,
    int SystemCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
