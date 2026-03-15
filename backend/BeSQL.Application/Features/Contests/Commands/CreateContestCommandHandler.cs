using BeSQL.Application.Common.Interfaces;
using BeSQL.Domain.Entities;
using BeSQL.Domain.Enums;
using MediatR;
using System.Text.RegularExpressions;

namespace BeSQL.Application.Features.Contests.Commands;

public sealed class CreateContestCommandHandler(
    IApplicationDbContext db,
    ICurrentUserService   currentUser
) : IRequestHandler<CreateContestCommand, Guid>
{
    public async Task<Guid> Handle(CreateContestCommand req, CancellationToken ct)
    {
        var contest = new Contest
        {
            Title       = req.Title,
            Slug        = Slugify(req.Title),
            Description = req.Description,
            StartTime   = req.StartTime,
            EndTime     = req.EndTime,
            Status      = req.StartTime > DateTime.UtcNow
                          ? ContestStatus.Upcoming
                          : ContestStatus.Draft,
            CreatedById = currentUser.UserId!.Value,
        };
        db.Contests.Add(contest);

        for (int i = 0; i < req.ProblemIds.Count; i++)
        {
            db.ContestProblems.Add(new ContestProblem
            {
                ContestId = contest.Id,
                ProblemId = req.ProblemIds[i],
                Order     = i + 1,
                Points    = 100,
            });
        }

        await db.SaveChangesAsync(ct);
        return contest.Id;
    }

    private static string Slugify(string title) =>
        Regex.Replace(title.ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
}
