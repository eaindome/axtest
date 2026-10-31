using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Axtest.Api.Migrations
{
    /// <inheritdoc />
    public partial class QueueAndSandboxIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Projects_WorkspaceId",
                table: "Projects");

            migrationBuilder.CreateIndex(
                name: "IX_TestRuns_Status_Id",
                table: "TestRuns",
                columns: new[] { "Status", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_Projects_Workspace_TutorialSandbox",
                table: "Projects",
                column: "WorkspaceId",
                unique: true,
                filter: "\"IsTutorialSandbox\" = true");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TestRuns_Status_Id",
                table: "TestRuns");

            migrationBuilder.DropIndex(
                name: "IX_Projects_Workspace_TutorialSandbox",
                table: "Projects");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_WorkspaceId",
                table: "Projects",
                column: "WorkspaceId");
        }
    }
}
