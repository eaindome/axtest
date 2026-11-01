using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Axtest.Api.Migrations
{
    /// <inheritdoc />
    public partial class SavedTestAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProjectTestAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProjectId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Environment = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TargetUrl = table.Column<string>(type: "text", nullable: false),
                    VariableNamesJson = table.Column<string>(type: "text", nullable: false),
                    ProtectedValues = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectTestAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectTestAccounts_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectTestAccounts_ProjectId_Environment_Name",
                table: "ProjectTestAccounts",
                columns: new[] { "ProjectId", "Environment", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProjectTestAccounts");
        }
    }
}
