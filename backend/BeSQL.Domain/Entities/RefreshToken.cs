namespace BeSQL.Domain.Entities;

/// <summary>Rotating refresh token for JWT auth.</summary>
public sealed class RefreshToken
{
    public int      Id        { get; set; }
    public Guid     UserId    { get; set; }
    public User?    User      { get; set; }
    public string   Token     { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool     IsRevoked { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
