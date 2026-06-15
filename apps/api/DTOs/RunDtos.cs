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
    DateTime? CompletedAt
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
    List<ResultDto> Results
);

public record ResultDto(
    long Id,
    string TestId,
    string TestName,
    string Status,
    int DurationMs,
    string? ErrorMessage,
    string? FailedStep,
    int Order
);
