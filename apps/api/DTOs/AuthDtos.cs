using System.ComponentModel.DataAnnotations;
namespace Axtest.Api.DTOs;
public record RegisterRequest(
    [Required, StringLength(100, MinimumLength = 2)] string Name,
    [Required, RegularExpression(@"^[a-zA-Z0-9_.-]{3,32}$")] string Username,
    [Required, StringLength(72, MinimumLength = 12)] string Password,
    [StringLength(100)] string? WorkspaceName = null);
public record LoginRequest([Required, StringLength(64)] string Username, [Required, StringLength(256)] string Password);
public record PasswordRequest([Required, StringLength(256)] string CurrentPassword, [Required, StringLength(72, MinimumLength = 12)] string NewPassword);
public record SessionResponse(UserDto? User, string CsrfToken, DateTime? ExpiresAt = null);
public record UserDto(long Id, string Name, string Username, DateTime CreatedAt);
