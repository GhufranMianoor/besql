using BeSQL.Application.Common.Interfaces;
using BeSQL.Application.Common.Models;
using BeSQL.Domain.Entities;
using BeSQL.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace BeSQL.Application.Features.Submissions.Commands;

public sealed record SubmitSolutionCommand(
    Guid    ProblemId,
    string  QueryText,
    Guid?   ContestId = null
) : IRequest<SubmitSolutionResult>;

public sealed record SubmitSolutionResult(
    Guid            SubmissionId,
    SubmissionStatus Status,
    double          ExecutionTimeMs,
    double          QueryCost,
    DiffResult?     Diff,
    string?         ErrorMessage
);

public sealed class SubmitSolutionCommandHandler(
    IApplicationDbContext db,
    ISqlExecutionService  executor,
    ICurrentUserService   currentUser
) : IRequestHandler<SubmitSolutionCommand, SubmitSolutionResult>
{
    public async Task<SubmitSolutionResult> Handle(SubmitSolutionCommand req, CancellationToken ct)
    {
        var problem = await db.Problems
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == req.ProblemId, ct)
            ?? throw new KeyNotFoundException($"Problem {req.ProblemId} not found.");

        var userId = currentUser.UserId!.Value;

        // Execute and judge the query
        var result = await executor.ExecuteAndJudgeAsync(
            problem.InitScript,
            req.QueryText,
            problem.GoldenSolution,
            ct);

        // Persist the submission
        var submission = new Submission
        {
            UserId          = userId,
            ProblemId       = req.ProblemId,
            ContestId       = req.ContestId,
            QueryText       = req.QueryText,
            Status          = result.Status,
            ExecutionTimeMs = result.ExecutionTimeMs,
            QueryCost       = result.QueryCost,
            DiffOutput      = System.Text.Json.JsonSerializer.Serialize(result.Diff),
            ErrorMessage    = result.ErrorMessage,
        };
        db.Submissions.Add(submission);

        // Update problem statistics
        var prob = await db.Problems.FindAsync([req.ProblemId], ct);
        if (prob is not null)
        {
            prob.SubmitCount++;
            if (result.Status == SubmissionStatus.Accepted)
                prob.AcceptCount++;
        }

        // Update user score if accepted for the first time
        if (result.Status == SubmissionStatus.Accepted)
        {
            bool firstAc = !await db.Submissions.AnyAsync(
                s => s.UserId == userId
                  && s.ProblemId == req.ProblemId
                  && s.Status == SubmissionStatus.Accepted, ct);

            if (firstAc)
            {
                var user = await db.Users.FindAsync([userId], ct);
                if (user is not null)
                {
                    user.Solved++;
                    user.Score += problem.Difficulty switch
                    {
                        Difficulty.Easy   => 10,
                        Difficulty.Medium => 25,
                        Difficulty.Hard   => 50,
                        _                 => 10,
                    };
                }
            }
        }

        await db.SaveChangesAsync(ct);

        return new SubmitSolutionResult(
            submission.Id,
            result.Status,
            result.ExecutionTimeMs,
            result.QueryCost,
            result.Diff,
            result.ErrorMessage);
    }
}
