using BeSQL.Application.Common.Interfaces;
using BeSQL.Application.Features.Submissions.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BeSQL.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class SubmissionsController(
    IMediator            mediator,
    ISqlExecutionService executor,
    IApplicationDbContext db
) : ControllerBase
{
    /// <summary>Submit a solution for judging.</summary>
    [HttpPost]
    public async Task<IActionResult> Submit(SubmitRequest req, CancellationToken ct)
    {
        var result = await mediator.Send(
            new SubmitSolutionCommand(req.ProblemId, req.QueryText, req.ContestId), ct);
        return Ok(result);
    }

    /// <summary>Run a query without judging (editor "Run" button).</summary>
    [HttpPost("run")]
    public async Task<IActionResult> RunQuery(RunQueryRequest req, CancellationToken ct)
    {
        var problem = await db.Problems.FindAsync([req.ProblemId], ct);
        if (problem is null) return NotFound();

        try
        {
            var result = await executor.RunQueryAsync(problem.InitScript, req.QueryText, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

public sealed record SubmitRequest(
    Guid    ProblemId,
    string  QueryText,
    Guid?   ContestId = null
);

public sealed record RunQueryRequest(
    Guid   ProblemId,
    string QueryText
);
