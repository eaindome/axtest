using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Axtest.Api.Controllers;

[ApiController, Authorize, Route("api/projects/{projectId:long}")]
public class ExplorerController(ProjectAccess access, ExplorerService explorer, AppDbContext db) : ControllerBase
{
    [HttpGet("explorer")]
    public async Task<IActionResult> Get(long projectId) => await access.Get(projectId) is null ? NotFound() : Ok(await explorer.Get(projectId));
    [HttpPost("files")]
    public async Task<IActionResult> Create(long projectId, CreateFileRequest req) => await access.Get(projectId, true) is null ? NotFound() : Ok(await explorer.Create(projectId, req));
    [HttpPut("files/{id:guid}")]
    public async Task<IActionResult> Save(long projectId, Guid id, SaveFileRequest req) => await access.Get(projectId, true) is null ? NotFound() : Ok(await explorer.SaveFile(projectId, id, req.Content, req.ExpectedUpdatedAt));
    [HttpDelete("files/{id:guid}")]
    public async Task<IActionResult> Delete(long projectId, Guid id)
    {
        if (await access.Get(projectId, true) is null) return NotFound();
        db.ProjectFiles.Remove(await explorer.File(projectId, id)); await explorer.Save(projectId);
        return Ok(await explorer.Get(projectId));
    }
    [HttpPatch("files/{id:guid}/rename")]
    public async Task<IActionResult> Rename(long projectId, Guid id, RenameRequest req)
    {
        if (await access.Get(projectId, true) is null) return NotFound();
        var file = await explorer.File(projectId, id);
        var slash = file.Path.LastIndexOf('/');
        return Ok(await explorer.MoveFile(projectId, id, slash < 0 ? null : file.Path[..slash], req.Name));
    }
    [HttpPatch("files/{id:guid}/move")]
    public async Task<IActionResult> Move(long projectId, Guid id, MoveFileRequest req) => await access.Get(projectId, true) is null ? NotFound() : Ok(await explorer.MoveFile(projectId, id, req.Folder));
    [HttpPost("folders")]
    public async Task<IActionResult> Folder(long projectId, FolderRequest req)
    {
        if (await access.Get(projectId, true) is null) return NotFound();
        await explorer.EnsureFolders(projectId, ExplorerService.Normalize(req.Path)); await explorer.Save(projectId);
        return Ok(await explorer.Get(projectId));
    }
    [HttpDelete("folders")]
    public async Task<IActionResult> DeleteFolder(long projectId, [FromBody] FolderRequest req)
    {
        if (await access.Get(projectId, true) is null) return NotFound();
        await explorer.DeleteFolder(projectId, req.Path); return Ok(await explorer.Get(projectId));
    }
    [HttpPatch("folders/rename")]
    public async Task<IActionResult> RenameFolder(long projectId, RenameFolderRequest req)
    {
        if (await access.Get(projectId, true) is null) return NotFound();
        var path = ExplorerService.Normalize(req.Path); var slash = path.LastIndexOf('/');
        await explorer.MoveFolder(projectId, path, slash < 0 ? null : path[..slash], req.Name);
        return Ok(await explorer.Get(projectId));
    }
    [HttpPatch("folders/move")]
    public async Task<IActionResult> MoveFolder(long projectId, MoveFolderRequest req)
    {
        if (await access.Get(projectId, true) is null) return NotFound();
        await explorer.MoveFolder(projectId, req.Path, req.TargetFolder); return Ok(await explorer.Get(projectId));
    }
}
