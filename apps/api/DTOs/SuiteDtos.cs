namespace Axtest.Api.DTOs;

public record CreateSuiteRequest(string Name, string Content);

public record UpdateSuiteRequest(string Name, string Content);

public record SuiteListDto(long Id, string Name, int RunCount, DateTime CreatedAt, DateTime UpdatedAt);

public record SuiteDetailDto(long Id, string Name, string Content, int RunCount, DateTime CreatedAt, DateTime UpdatedAt);
