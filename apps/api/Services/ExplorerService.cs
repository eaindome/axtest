using Axtest.Api.Data;
using Axtest.Api.DTOs;
using Axtest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Services;

public class ExplorerService(AppDbContext db)
{
    public static string Normalize(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new ArgumentException("A path is required.");
        value = value.Trim().Replace('\\', '/').Trim('/');
        if (value.Length > 512 || value.Split('/').Any(s => s is "" or "." or ".." || s != s.Trim() || s.Any(c => char.IsControl(c) || "<>:\"|?*".Contains(c))))
            throw new ArgumentException("Use a relative path without empty, dot, or reserved segments.");
        return value;
    }
    public static string FileName(string name)
    {
        name = Normalize(name);
        if (name.Contains('/')) throw new ArgumentException("The name cannot contain a path.");
        return name.EndsWith(".axtest", StringComparison.OrdinalIgnoreCase) ? name : name + ".axtest";
    }
    public static FileDto Dto(ProjectFile f) => new(f.Id, f.Path.Split('/').Last(), f.Path, f.Content, f.UpdatedAt);
    public async Task<ExplorerDto> Get(long projectId)
    {
        var entries = await db.ProjectFiles.Where(f => f.ProjectId == projectId).OrderBy(f => f.Path).ToListAsync();
        return new(entries.Where(f => !f.IsFolder).Select(Dto).ToList(), entries.Where(f => f.IsFolder).Select(f => f.Path).ToList());
    }
    public async Task<ProjectFile> File(long projectId, Guid id) => await db.ProjectFiles.FirstOrDefaultAsync(f => f.ProjectId == projectId && f.Id == id && !f.IsFolder)
        ?? throw new KeyNotFoundException("Test file not found.");
    public async Task EnsureFolders(long projectId, string? path)
    {
        if (string.IsNullOrEmpty(path)) return;
        var segments = Normalize(path).Split('/');
        var entries = await db.ProjectFiles.Where(f => f.ProjectId == projectId).ToListAsync();
        for (int i = 1; i <= segments.Length; i++)
        {
            var part = string.Join('/', segments.Take(i));
            var existing = entries.FirstOrDefault(f => f.Path == part) ?? db.ProjectFiles.Local.FirstOrDefault(f => f.ProjectId == projectId && f.Path == part);
            if (existing is { IsFolder: false }) throw new ResourceConflictException("A file occupies a parent folder path.");
            if (existing is null) db.ProjectFiles.Add(new ProjectFile { ProjectId = projectId, Path = part, IsFolder = true });
        }
    }
    public async Task Save(long projectId)
    {
        var project = await db.Projects.FindAsync(projectId) ?? throw new KeyNotFoundException("Project not found.");
        project.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }
    public async Task<FileDto> Create(long projectId, CreateFileRequest req)
    {
        var name = FileName(req.Name);
        var folder = string.IsNullOrWhiteSpace(req.Folder) ? null : Normalize(req.Folder);
        var path = folder is null ? name : folder + "/" + name;
        Normalize(path);
        if (await db.ProjectFiles.AnyAsync(f => f.ProjectId == projectId && f.Path == path)) throw new ResourceConflictException("A file or folder with that name already exists.");
        await EnsureFolders(projectId, folder);
        var file = new ProjectFile { ProjectId = projectId, Path = path, Content = "---\ntitle: " + name[..^7] + "\n---\n" };
        db.ProjectFiles.Add(file);
        await Save(projectId);
        return Dto(file);
    }
    public async Task<FileDto> SaveFile(long projectId, Guid id, string content)
    {
        if (content is null || content.Length > 1_000_000) throw new ArgumentException("File content must be at most 1 MB.");
        var file = await File(projectId, id);
        file.Content = content; file.UpdatedAt = DateTime.UtcNow;
        await Save(projectId);
        return Dto(file);
    }
    public async Task<FileDto> MoveFile(long projectId, Guid id, string? folder, string? name = null)
    {
        var file = await File(projectId, id);
        folder = string.IsNullOrWhiteSpace(folder) ? null : Normalize(folder);
        var next = (folder is null ? "" : folder + "/") + (name is null ? file.Path.Split('/').Last() : FileName(name));
        Normalize(next);
        if (await db.ProjectFiles.AnyAsync(f => f.ProjectId == projectId && f.Id != id && f.Path == next)) throw new ResourceConflictException("This name already exists in the destination.");
        await EnsureFolders(projectId, folder);
        file.Path = next; file.UpdatedAt = DateTime.UtcNow;
        await Save(projectId);
        return Dto(file);
    }
    public async Task MoveFolder(long projectId, string source, string? targetFolder, string? name = null)
    {
        source = Normalize(source);
        if (source is "auth" or "modules") throw new ArgumentException("The auth and modules root folders cannot be moved or renamed.");
        targetFolder = string.IsNullOrWhiteSpace(targetFolder) ? null : Normalize(targetFolder);
        if (targetFolder == source || targetFolder?.StartsWith(source + "/", StringComparison.Ordinal) == true) throw new ArgumentException("A folder cannot be moved inside itself.");
        var leaf = name is null ? source.Split('/').Last() : Normalize(name);
        if (leaf.Contains('/')) throw new ArgumentException("Folder name cannot contain a path.");
        var destination = (targetFolder is null ? "" : targetFolder + "/") + leaf;
        if (source == destination) return;
        var all = await db.ProjectFiles.Where(f => f.ProjectId == projectId).ToListAsync();
        if (!all.Any(f => f.Path == source && f.IsFolder)) throw new KeyNotFoundException("Folder not found.");
        if (all.Any(f => f.Path == destination)) throw new ResourceConflictException("Destination already exists.");
        var affected = all.Where(f => f.Path == source || f.Path.StartsWith(source + "/", StringComparison.Ordinal)).ToList();
        foreach (var f in affected)
        {
            var next = Normalize(destination + f.Path[source.Length..]);
            if (all.Except(affected).Any(x => x.Path == next)) throw new ResourceConflictException("A destination path already exists.");
            f.Path = next; f.UpdatedAt = DateTime.UtcNow;
        }
        await EnsureFolders(projectId, targetFolder);
        await Save(projectId);
    }
    public async Task DeleteFolder(long projectId, string path)
    {
        path = Normalize(path);
        if (path is "auth" or "modules") throw new ArgumentException("The auth and modules root folders cannot be deleted.");
        var entries = await db.ProjectFiles.Where(f => f.ProjectId == projectId && (f.Path == path || f.Path.StartsWith(path + "/"))).ToListAsync();
        if (!entries.Any(f => f.Path == path && f.IsFolder)) throw new KeyNotFoundException("Folder not found.");
        db.ProjectFiles.RemoveRange(entries);
        await Save(projectId);
    }
}
