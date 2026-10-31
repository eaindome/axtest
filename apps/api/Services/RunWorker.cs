using System.Text.Json;
using Axtest.Api.Data;
using Axtest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Services;

// One API instance owns the local worker. PostgreSQL row locking also prevents duplicate claims.
public class RunWorker(IServiceScopeFactory scopes, RunnerProcess runner, ILogger<RunWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        Directory.CreateDirectory(runner.ArtifactRoot);
        using var ownership = new FileStream(Path.Combine(runner.ArtifactRoot, ".worker.lock"), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
        // Interrupted runs are never silently replayed: tests can have external side effects.
        using (var startup = scopes.CreateScope())
        {
            var db = startup.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.TestRuns.Where(r => r.Status == RunStatus.Running).ExecuteUpdateAsync(set => set
                .SetProperty(r => r.Status, RunStatus.Failed).SetProperty(r => r.CompletedAt, DateTime.UtcNow)
                .SetProperty(r => r.ErrorMessage, "Run interrupted by a server restart."), stoppingToken);
        }
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                TestRun? run;
                await using (var transaction = await db.Database.BeginTransactionAsync(stoppingToken))
                {
                    run = (await db.TestRuns.FromSqlRaw("SELECT * FROM \"TestRuns\" WHERE \"Status\" = 'Pending' AND \"InputJson\" IS NOT NULL ORDER BY \"Id\" FOR UPDATE SKIP LOCKED LIMIT 1").ToListAsync(stoppingToken)).FirstOrDefault();
                    if (run is not null) { run.Status = RunStatus.Running; run.StartedAt = DateTime.UtcNow; await db.SaveChangesAsync(stoppingToken); }
                    await transaction.CommitAsync(stoppingToken);
                }
                if (run is null) { await Task.Delay(300, stoppingToken); continue; }
                await Execute(db, run, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception error)
            {
                logger.LogError("Runner loop failed ({ErrorType}).", error.GetType().Name);
                await Task.Delay(1000, stoppingToken);
            }
        }
    }
    private async Task Execute(AppDbContext db, TestRun run, CancellationToken stoppingToken)
    {
        try
        {
            var input = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(run.InputJson!)!;
            var directory = Path.Combine(runner.ArtifactRoot, run.Id.ToString());
            input["browserExecutablePath"] = JsonSerializer.SerializeToElement(runner.BrowserExecutablePath);
            input["timeoutMs"] = JsonSerializer.SerializeToElement(runner.TimeoutMilliseconds);
            input["artifactDirectory"] = JsonSerializer.SerializeToElement(directory);
            var result = await runner.Invoke(input, directory, stoppingToken);
            run.DurationMs = result.GetProperty("duration").GetInt32();
            run.PassedTests = result.GetProperty("passed").GetInt32();
            run.FailedTests = result.GetProperty("failed").GetInt32();
            run.Status = result.GetProperty("status").GetString() == "passed" ? RunStatus.Passed : RunStatus.Failed;
            if (result.TryGetProperty("error", out var error)) run.ErrorMessage = error.GetString();
            int order = 0;
            foreach (var test in result.GetProperty("tests").EnumerateArray())
            {
                var steps = test.GetProperty("steps");
                var failed = steps.EnumerateArray().FirstOrDefault(s => s.GetProperty("status").GetString() == "failed");
                var screenshot = steps.EnumerateArray().FirstOrDefault(s => s.TryGetProperty("screenshot", out _));
                db.TestResults.Add(new TestResult {
                    RunId = run.Id, TestId = test.GetProperty("id").GetString()!, TestName = test.GetProperty("description").GetString()!,
                    Status = Enum.Parse<ResultStatus>(test.GetProperty("status").GetString()!, true), DurationMs = test.GetProperty("duration").GetInt32(),
                    ErrorMessage = failed.ValueKind == JsonValueKind.Undefined ? null : failed.GetProperty("error").GetString(),
                    FailedStep = failed.ValueKind == JsonValueKind.Undefined ? null : failed.GetProperty("raw").GetString(),
                    ScreenshotPath = screenshot.ValueKind == JsonValueKind.Undefined ? null : Path.GetFileName(screenshot.GetProperty("screenshot").GetString()),
                    StepsJson = steps.GetRawText(), SkipReason = test.TryGetProperty("skipReason", out var reason) ? reason.GetString() : null,
                    Order = ++order,
                });
            }
        }
        catch (Exception error)
        {
            run.Status = RunStatus.Failed;
            run.ErrorMessage = error is OperationCanceledException ? "Execution timed out or the server stopped." : error is ArgumentException ? error.Message : "Execution worker failed. Check its installation and browser availability.";
        }
        if (run.ErrorMessage is not null && !db.TestResults.Local.Any(r => r.RunId == run.Id))
        {
            using var snapshot = JsonDocument.Parse(run.InputJson!);
            if (snapshot.RootElement.TryGetProperty("selectedTests", out var selected))
            {
                int order = 0;
                foreach (var test in selected.EnumerateArray())
                {
                    order++;
                    db.TestResults.Add(new TestResult { RunId = run.Id, TestId = test.GetProperty("id").GetString()!, TestName = test.GetProperty("name").GetString()!,
                        Status = order == 1 ? ResultStatus.Failed : ResultStatus.Skipped, ErrorMessage = order == 1 ? run.ErrorMessage : null,
                        FailedStep = order == 1 ? "Execution worker" : null, SkipReason = order > 1 ? "Run could not complete because the execution worker failed." : null, Order = order });
                }
                run.FailedTests = order > 0 ? 1 : 0;
            }
        }
        run.CompletedAt = DateTime.UtcNow;
        if (run.DurationMs == 0) run.DurationMs = (int)(run.CompletedAt.Value - run.StartedAt).TotalMilliseconds;
        await db.SaveChangesAsync(CancellationToken.None);
    }
}
