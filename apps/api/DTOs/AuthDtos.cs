namespace Axtest.Api.DTOs;

public record RegisterRequest(string Name, string Email, string Password, string WorkspaceName);

public record LoginRequest(string Email, string Password);

public record AuthResponse(string Token, UserDto User, List<WorkspaceDto> Workspaces);

public record UserDto(long Id, string Name, string Email, DateTime CreatedAt);
