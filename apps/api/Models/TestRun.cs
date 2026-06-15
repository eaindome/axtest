namespace Axtest.Api.Models;

public enum RunStatus { Pending, Running, Passed, Failed }

public class TestRun
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public long? TestSuiteId { get; set; }
    public RunStatus Status { get; set; } = RunStatus.Pending;
    public string Environment { get; set; } = string.Empty;
    public int TotalTests { get; set; }
    public int PassedTests { get; set; }
    public int FailedTests { get; set; }
    public int DurationMs { get; set; }
    public string? TriggeredBy { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public Project Project { get; set; } = null!;
    public TestSuite? TestSuite { get; set; }
    public ICollection<TestResult> Results { get; set; } = [];
}
