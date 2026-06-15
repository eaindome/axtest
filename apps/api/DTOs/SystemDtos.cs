namespace Axtest.Api.DTOs;

public record CreateSystemRequest(string Name, string? Description, string? BaseUrl);

public record UpdateSystemRequest(string Name, string? Description, string? BaseUrl);

public record SystemListDto(long Id, string Name, string? Description, string? BaseUrl, int ModuleCount, DateTime CreatedAt, DateTime UpdatedAt);

public record SystemDetailDto(long Id, string Name, string? Description, string? BaseUrl, int ModuleCount, DateTime CreatedAt, DateTime UpdatedAt);
