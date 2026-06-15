namespace Axtest.Api.DTOs;

public record CreateModuleRequest(string Name, string? Description);

public record UpdateModuleRequest(string Name, string? Description);

public record ModuleListDto(long Id, string Name, string? Description, int SuiteCount, DateTime CreatedAt, DateTime UpdatedAt);

public record ModuleDetailDto(long Id, string Name, string? Description, int SuiteCount, DateTime CreatedAt, DateTime UpdatedAt);
