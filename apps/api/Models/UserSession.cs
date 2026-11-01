namespace Axtest.Api.Models;
public class UserSession
{
    public string Id { get; set; } = ""; // SHA-256 of a cryptographically random session identifier.
    public long UserId { get; set; }
    public DateTime ExpiresAt { get; set; }
    public User User { get; set; } = null!;
}
