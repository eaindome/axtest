namespace Axtest.Api.Models;

public enum ResultStatus { Passed, Failed, Skipped }

public class TestResult
{
    public long Id { get; set; }
    public long RunId { get; set; }
    public string TestId { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public ResultStatus Status { get; set; }
    public int DurationMs { get; set; }
    public string? ErrorMessage { get; set; }
    public string? FailedStep { get; set; }
    public string? ScreenshotPath { get; set; }
    public int Order { get; set; }

    public TestRun Run { get; set; } = null!;
}
