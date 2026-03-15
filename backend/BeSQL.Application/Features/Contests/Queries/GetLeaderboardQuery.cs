using BeSQL.Application.Common.Interfaces;
using BeSQL.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace BeSQL.Application.Features.Contests.Queries;

public sealed record GetLeaderboardQuery(Guid ContestId, int Top = 50)
    : IRequest<LeaderboardResult>;

public sealed record LeaderboardEntry(
    int    Rank,
    string Username,
    int    TotalScore,
    int    SolvedCount
);

public sealed record LeaderboardResult(
    Guid                  ContestId,
    string                ContestTitle,
    List<LeaderboardEntry> Entries
);

public sealed class GetLeaderboardQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetLeaderboardQuery, LeaderboardResult>
{
    public async Task<LeaderboardResult> Handle(GetLeaderboardQuery req, CancellationToken ct)
    {
        var contest = await db.Contests
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == req.ContestId, ct)
            ?? throw new KeyNotFoundException("Contest not found.");

        var entries = await db.ContestParticipants
            .AsNoTracking()
            .Where(p => p.ContestId == req.ContestId)
            .OrderByDescending(p => p.TotalScore)
            .Take(req.Top)
            .Select(p => new
            {
                p.User!.Username,
                p.TotalScore,
                SolvedCount = db.Submissions.Count(s =>
                    s.ContestId == req.ContestId
                    && s.UserId == p.UserId
                    && s.Status == SubmissionStatus.Accepted)
            })
            .ToListAsync(ct);

        return new LeaderboardResult(
            req.ContestId,
            contest.Title,
            entries.Select((e, i) => new LeaderboardEntry(i + 1, e.Username, e.TotalScore, e.SolvedCount)).ToList()
        );
    }
}
