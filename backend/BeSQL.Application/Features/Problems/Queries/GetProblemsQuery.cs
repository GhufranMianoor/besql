using BeSQL.Application.Common.Interfaces;
using BeSQL.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace BeSQL.Application.Features.Problems.Queries;

public sealed record GetProblemsQuery(
    Difficulty? Difficulty = null,
    string?     Tag        = null,
    int         Page       = 1,
    int         PageSize   = 20
) : IRequest<GetProblemsResult>;

public sealed record ProblemSummary(
    Guid       Id,
    string     Title,
    string     Slug,
    Difficulty Difficulty,
    List<string> Tags,
    int        AcceptCount,
    int        SubmitCount,
    double     AcceptRate
);

public sealed record GetProblemsResult(
    List<ProblemSummary> Items,
    int                  Total
);

public sealed class GetProblemsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetProblemsQuery, GetProblemsResult>
{
    public async Task<GetProblemsResult> Handle(GetProblemsQuery req, CancellationToken ct)
    {
        var query = db.Problems
            .AsNoTracking()
            .Where(p => p.IsPublished);

        if (req.Difficulty.HasValue)
            query = query.Where(p => p.Difficulty == req.Difficulty.Value);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderBy(p => p.Difficulty)
            .ThenBy(p => p.Title)
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .Select(p => new ProblemSummary(
                p.Id,
                p.Title,
                p.Slug,
                p.Difficulty,
                new List<string>(),   // Tags deserialized in app layer
                p.AcceptCount,
                p.SubmitCount,
                p.SubmitCount == 0 ? 0 : Math.Round((double)p.AcceptCount / p.SubmitCount * 100, 1)
            ))
            .ToListAsync(ct);

        return new GetProblemsResult(items, total);
    }
}
