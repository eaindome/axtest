namespace Axtest.Api.DTOs;

public record SubmitRunRequest(
    string Environment,
    long? TestSuiteId,
    int TotalTests,
    int PassedTests,
    int FailedTests,
    int DurationMs,
    string? TriggeredBy,
    DateTime StartedAt,
    DateTime CompletedAt,
    List<SubmitResultItem> Results
);

public record SubmitResultItem(
    string TestId,
    string TestName,
    string Status,
    int DurationMs,
    string? ErrorMessage,
    string? FailedStep,
    int Order
);

public record RunListDto(
    long Id,
    string Status,
    string Environment,
    int TotalTests,
    int PassedTests,
    int FailedTests,
    int DurationMs,
    string? SuiteName,
    string? TriggeredBy,
    DateTime StartedAt,
    DateTime? CompletedAt,
    string? ErrorMessage = null
);

public record RunDetailDto(
    long Id,
    string Status,
    string Environment,
    int TotalTests,
    int PassedTests,
    int FailedTests,
    int DurationMs,
    string? SuiteName,
    string? TriggeredBy,
    DateTime StartedAt,
    DateTime? CompletedAt,
    List<ResultDto> Results,
    string? ErrorMessage = null
);

public record ResultDto(
    long Id,
    string TestId,
    string TestName,
    string Status,
    int DurationMs,
    string? ErrorMessage,
    string? FailedStep,
    int Order,
    string? ScreenshotUrl = null,
    List<StepDto>? Steps = null,
    string? SkipReason = null
);

public record StepDto(string Raw, string Status, int DurationMs, string? Error, string? ScreenshotUrl);
