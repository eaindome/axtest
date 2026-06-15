using Axtest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Axtest.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<AppSystem> Systems => Set<AppSystem>();
    public DbSet<Module> Modules => Set<Module>();
    public DbSet<TestSuite> TestSuites => Set<TestSuite>();
    public DbSet<TestRun> TestRuns => Set<TestRun>();
    public DbSet<TestResult> TestResults => Set<TestResult>();
    public DbSet<ProjectEnvironment> ProjectEnvironments => Set<ProjectEnvironment>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
        });

        model.Entity<Workspace>(e =>
        {
            e.HasMany(w => w.Members).WithOne(m => m.Workspace)
             .HasForeignKey(m => m.WorkspaceId).OnDelete(DeleteBehavior.Cascade);

            e.HasMany(w => w.Projects).WithOne(p => p.Workspace)
             .HasForeignKey(p => p.WorkspaceId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<WorkspaceMember>(e =>
        {
            e.Property(m => m.Role).HasConversion<string>();
            e.HasIndex(m => new { m.WorkspaceId, m.UserId }).IsUnique();

            e.HasOne(m => m.User).WithMany(u => u.Memberships)
             .HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<AppSystem>(e =>
        {
            e.HasOne(s => s.Project).WithMany(p => p.Systems)
             .HasForeignKey(s => s.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<Module>(e =>
        {
            e.HasOne(m => m.System).WithMany(s => s.Modules)
             .HasForeignKey(m => m.SystemId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<TestSuite>(e =>
        {
            e.HasOne(s => s.Module).WithMany(m => m.TestSuites)
             .HasForeignKey(s => s.ModuleId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<TestRun>(e =>
        {
            e.Property(r => r.Status).HasConversion<string>();
            e.HasOne(r => r.Project).WithMany(p => p.TestRuns)
             .HasForeignKey(r => r.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.TestSuite).WithMany(s => s.TestRuns)
             .HasForeignKey(r => r.TestSuiteId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);
        });

        model.Entity<TestResult>(e =>
        {
            e.Property(r => r.Status).HasConversion<string>();
            e.HasOne(r => r.Run).WithMany(run => run.Results)
             .HasForeignKey(r => r.RunId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<ProjectEnvironment>(e =>
        {
            e.HasIndex(x => new { x.ProjectId, x.Name }).IsUnique();
            e.HasOne(x => x.Project).WithMany(p => p.Environments)
             .HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
