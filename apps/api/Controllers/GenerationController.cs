using Axtest.Api.DTOs;
using Axtest.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace Axtest.Api.Controllers;
[ApiController, Authorize, Route("api/projects/{projectId:long}/generate-tests")]
public class GenerationController(ProjectAccess access, ExplorerService explorer, RunnerProcess runner) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Generate(long projectId, GenerateRequest req)
    {
        if (await access.Get(projectId, true) is null) return NotFound();
        await explorer.File(projectId, req.FileId);
        if (req.Content is null || req.Content.Length > 1_000_000) return BadRequest("Content must be at most 1 MB.");
        return Ok(await runner.Invoke(new { command = "generate", content = req.Content, seedTestId = req.SeedTestId }, cancellation: HttpContext.RequestAborted));
    }
}
