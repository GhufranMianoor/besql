namespace BeSQL.Domain.Entities;

/// <summary>Tracks a user's participation in a contest.</summary>
public sealed class ContestParticipant
{
    public Guid     ContestId    { get; set; }
    public Contest? Contest      { get; set; }
    public Guid     UserId       { get; set; }
    public User?    User         { get; set; }
    public int      TotalScore   { get; set; }
    public int      Rank         { get; set; }
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
}
