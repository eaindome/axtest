using System.Text.Json;
using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Models;
using Axtest.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Controllers;

[ApiController, Authorize]
public class TutorialController(AppDbContext db, ProjectAccess access, ExplorerService explorer, IHostEnvironment host) : ControllerBase
{
    private record Lesson(string Path, string Content);
    private Dictionary<string, Lesson> Lessons() => JsonSerializer.Deserialize<Dictionary<string, Lesson>>(
        System.IO.File.ReadAllText(Path.Combine(host.ContentRootPath, "Data/TutorialContent.json")), new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    [HttpPost("api/workspaces/{workspaceId:long}/tutorial-sandbox")]
    public async Task<IActionResult> Fork(long workspaceId)
    {
        if (!await access.Workspace(workspaceId, true)) return NotFound();
        var project = await db.Projects.FirstOrDefaultAsync(p => p.WorkspaceId == workspaceId && p.IsTutorialSandbox);
        if (project is null)
        {
            await using var transaction = await db.Database.BeginTransactionAsync();
            project = new Project { WorkspaceId = workspaceId, IsTutorialSandbox = true, Name = "TaskFlow Tutorial (Sandbox)", BaseUrl = "https://todo.taskflow.app", Description = "Practice project. Configure a reachable application URL before running tests." };
            db.Projects.Add(project); await db.SaveChangesAsync();
            var lessons = Lessons();
            foreach (var id in new[] { "tutorial-1-create-file", "tutorial-5-assertions", "tutorial-8-organize" })
            {
                var lesson = lessons[id];
                await explorer.EnsureFolders(project.Id, lesson.Path[..lesson.Path.LastIndexOf('/')]);
                db.ProjectFiles.Add(new ProjectFile { ProjectId = project.Id, Path = lesson.Path, Content = lesson.Content });
            }
            await explorer.EnsureFolders(project.Id, "auth");
            db.ProjectFiles.Add(new ProjectFile { ProjectId = project.Id, Path = "auth/standard-login.axtest", Content = "AUTH standard-login\nSTEPS\n  navigate to /login\n  type \"qa@taskflow.app\" in \"Email\"\n  type \"Password123!\" in \"Password\"\n  click \"Sign in\"\nASSERT\n  assert \"Tasks\" is_visible\n" });
            await explorer.Save(project.Id); await transaction.CommitAsync();
        }
        return Ok(new
        {
            project = new ProjectDto(project.Id, project.Name, project.BaseUrl, project.Description,
            await db.TestRuns.CountAsync(r => r.ProjectId == project.Id), await db.Systems.CountAsync(s => s.ProjectId == project.Id), project.CreatedAt, project.UpdatedAt)
        });
    }
    [HttpPost("api/projects/{projectId:long}/tutorial/reset-lesson")]
    public async Task<IActionResult> Reset(long projectId, ResetLessonRequest req)
    {
        var project = await access.Get(projectId, true);
        if (project is null) return NotFound();
        if (!project.IsTutorialSandbox) return BadRequest("Lesson reset is only available in a tutorial sandbox.");
        if (!Lessons().TryGetValue(req.LessonId, out var lesson)) return BadRequest("Unknown lesson.");
        var file = await db.ProjectFiles.FirstOrDefaultAsync(f => f.ProjectId == projectId && f.Path == lesson.Path && !f.IsFolder);
        if (file is null) { await explorer.EnsureFolders(projectId, lesson.Path[..lesson.Path.LastIndexOf('/')]); file = new ProjectFile { ProjectId = projectId, Path = lesson.Path }; db.ProjectFiles.Add(file); }
        file.Content = lesson.Content; file.UpdatedAt = DateTime.UtcNow;
        await explorer.Save(projectId); return Ok(ExplorerService.Dto(file));
    }
}
