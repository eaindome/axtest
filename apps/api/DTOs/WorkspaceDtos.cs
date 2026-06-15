namespace Axtest.Api.DTOs;

public record CreateWorkspaceRequest(string Name);

public record UpdateWorkspaceRequest(string Name);

public record WorkspaceDto(long Id, string Name, int MemberCount, int ProjectCount, DateTime CreatedAt);

public record WorkspaceMemberDto(long Id, long UserId, string UserName, string UserEmail, string Role, DateTime JoinedAt);

public record InviteMemberRequest(string Email, string Role);
