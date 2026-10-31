using System.Diagnostics;
using System.Text.Json;

namespace Axtest.Api.Services;

public class RunnerProcess(IHostEnvironment environment, IConfiguration config, ILogger<RunnerProcess> logger)
{
    private readonly SemaphoreSlim slots = new(2);
    public int TimeoutMilliseconds => Math.Clamp(config.GetValue("Runner:TimeoutSeconds", 120), 5, 300) * 1000;
    public string? BrowserExecutablePath => config["Runner:BrowserExecutablePath"];
    public string ArtifactRoot => Path.GetFullPath(config["Runner:ArtifactRoot"] ?? Path.Combine(environment.ContentRootPath, ".runs"));
    public void RemoveArtifacts(long runId)
    {
        var directory = Path.GetFullPath(Path.Combine(ArtifactRoot, runId.ToString()));
        if (!directory.StartsWith(ArtifactRoot.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Artifact path must remain inside the configured artifact directory.");
        try { if (Directory.Exists(directory)) Directory.Delete(directory, true); }
        catch (IOException) { logger.LogWarning("Artifacts for run {RunId} are still in use; cleanup can be retried later.", runId); }
        catch (UnauthorizedAccessException) { logger.LogWarning("Could not remove artifacts for run {RunId}.", runId); }
    }
    public async Task<JsonElement> Invoke(object input, string? workingDirectory = null, CancellationToken cancellation = default)
    {
        await slots.WaitAsync(cancellation);
        var transient = workingDirectory is null;
        var directory = workingDirectory ?? Path.Combine(ArtifactRoot, "transient-" + Guid.NewGuid());
        try
        {
            Directory.CreateDirectory(directory);
            var worker = Path.GetFullPath(config["Runner:WorkerPath"] ?? Path.Combine(environment.ContentRootPath, "../../packages/core/dist/worker.js"));
            if (!File.Exists(worker)) throw new InvalidOperationException("Build @axtest/core before starting the API.");
            var start = new ProcessStartInfo(config["Runner:NodePath"] ?? "node")
            {
                WorkingDirectory = directory, UseShellExecute = false,
                RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true,
            };
            start.ArgumentList.Add(worker);
            var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "PATH", "SystemRoot", "WINDIR", "TEMP", "TMP", "HOME", "USERPROFILE", "LOCALAPPDATA", "PLAYWRIGHT_BROWSERS_PATH" };
            foreach (var key in start.Environment.Keys.ToList()) if (!allowed.Contains(key)) start.Environment.Remove(key);
            using var process = new Process { StartInfo = start };
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellation);
            timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(config.GetValue("Runner:TimeoutSeconds", 120), 5, 300)));
            process.Start();
            var stdout = process.StandardOutput.ReadToEndAsync();
            var stderr = process.StandardError.ReadToEndAsync();
            try
            {
                await process.StandardInput.WriteAsync(JsonSerializer.Serialize(input));
                process.StandardInput.Close();
                await process.WaitForExitAsync(timeout.Token);
            }
            catch
            {
                if (!process.HasExited) process.Kill(entireProcessTree: true);
                await process.WaitForExitAsync(CancellationToken.None);
                throw;
            }
            var output = await stdout;
            await stderr; // Drain diagnostics without exposing process environment or credentials.
            if (output.Length > 8_000_000) throw new InvalidOperationException("Worker response exceeded its size limit.");
            using var document = JsonDocument.Parse(output);
            var response = document.RootElement;
            if (!response.GetProperty("ok").GetBoolean()) throw new ArgumentException(response.GetProperty("error").GetString() ?? "Execution failed.");
            if (process.ExitCode != 0) throw new InvalidOperationException("Worker process failed.");
            return response.GetProperty("result").Clone();
        }
        finally
        {
            slots.Release();
            if (transient && Directory.Exists(directory)) Directory.Delete(directory, true);
        }
    }
}
