using System.ComponentModel.DataAnnotations;
namespace Axtest.Api.DTOs;

public record CreateSuiteRequest(string Name, string Content);
public record UpdateSuiteRequest(string Name, string Content);
public record SuiteListDto(long Id, string Name, int RunCount, DateTime CreatedAt, DateTime UpdatedAt);
public record SuiteDetailDto(long Id, string Name, string Content, int RunCount, DateTime CreatedAt, DateTime UpdatedAt);

public record SaveTestAccountRequest([Required, StringLength(80, MinimumLength = 2)] string Name,
    [Required] string Environment, [Required] Dictionary<string, string> Variables);
public record TestAccountDto(Guid Id, string Name, string Environment, string TargetUrl, string[] VariableNames, DateTime UpdatedAt);
public record SuiteFileRequest(Guid FileId, string[]? TestNames);
public record RunSuitesRequest([Required] string Environment, [Required] List<SuiteFileRequest> Files,
    Guid? AccountId = null, bool Headed = false, Dictionary<string, string>? Variables = null, int? SlowMoMs = null);
