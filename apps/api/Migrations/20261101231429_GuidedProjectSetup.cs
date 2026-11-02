using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Axtest.Api.Migrations
{
    /// <inheritdoc />
    public partial class GuidedProjectSetup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProjectSetups",
                columns: table => new
                {
                    ProjectId = table.Column<long>(type: "bigint", nullable: false),
                    Environment = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    LoginRequired = table.Column<bool>(type: "boolean", nullable: true),
                    LoginFlowId = table.Column<Guid>(type: "uuid", nullable: true),
                    DefaultAccountId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectSetups", x => new { x.ProjectId, x.Environment });
                    table.ForeignKey(
                        name: "FK_ProjectSetups_ProjectFiles_LoginFlowId",
                        column: x => x.LoginFlowId,
                        principalTable: "ProjectFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ProjectSetups_ProjectTestAccounts_DefaultAccountId",
                        column: x => x.DefaultAccountId,
                        principalTable: "ProjectTestAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ProjectSetups_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSetups_DefaultAccountId",
                table: "ProjectSetups",
                column: "DefaultAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectSetups_LoginFlowId",
                table: "ProjectSetups",
                column: "LoginFlowId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProjectSetups");
        }
    }
}
