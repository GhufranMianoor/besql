using BeSQL.Application.Common.Interfaces;
using BeSQL.Domain.Entities;
using MediatR;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace BeSQL.Application.Features.Problems.Commands;

public sealed class CreateProblemCommandHandler(
    IApplicationDbContext db,
    ICurrentUserService   currentUser
) : IRequestHandler<CreateProblemCommand, Guid>
{
    public async Task<Guid> Handle(CreateProblemCommand req, CancellationToken ct)
    {
        var problem = new Problem
        {
            Title          = req.Title,
            Slug           = Slugify(req.Title),
            Description    = req.Description,
            Difficulty     = req.Difficulty,
            InitScript     = req.InitScript,
            GoldenSolution = req.GoldenSolution,
            Tags           = JsonSerializer.Serialize(req.Tags),
            AuthorId       = currentUser.UserId!.Value,
        };

        db.Problems.Add(problem);

        // Create initial version snapshot
        db.ProblemVersions.Add(new ProblemVersion
        {
            ProblemId      = problem.Id,
            Version        = 1,
            Title          = problem.Title,
            Description    = problem.Description,
            InitScript     = problem.InitScript,
            GoldenSolution = problem.GoldenSolution,
            ChangedById    = problem.AuthorId,
            ChangeNote     = "Initial version",
        });

        await db.SaveChangesAsync(ct);
        return problem.Id;
    }

    private static string Slugify(string title) =>
        Regex.Replace(title.ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-');
}
