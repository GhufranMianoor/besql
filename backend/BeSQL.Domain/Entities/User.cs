using BeSQL.Domain.Enums;

namespace BeSQL.Domain.Entities;

/// <summary>Application user — extends identity with platform-specific data.</summary>
public sealed class User
{
    public Guid     Id           { get; set; } = Guid.NewGuid();
    public string   Username     { get; set; } = string.Empty;
    public string   Email        { get; set; } = string.Empty;
    public string   PasswordHash { get; set; } = string.Empty;
    public UserRole Role         { get; set; } = UserRole.Contestant;
    public int      Score        { get; set; }
    public int      Solved       { get; set; }
    public int      Streak       { get; set; }
    public DateTime? LastSolveAt { get; set; }
    public string?  AvatarUrl    { get; set; }
    public string?  Bio          { get; set; }
    public DateTime CreatedAt    { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt    { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Submission>         Submissions          { get; set; } = [];
    public ICollection<ContestParticipant> ContestParticipants  { get; set; } = [];
    public ICollection<RefreshToken>       RefreshTokens        { get; set; } = [];
}
