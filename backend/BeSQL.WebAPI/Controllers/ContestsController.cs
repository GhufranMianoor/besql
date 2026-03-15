using BeSQL.Application.Features.Contests.Commands;
using BeSQL.Application.Features.Contests.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BeSQL.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ContestsController(IMediator mediator) : ControllerBase
{
    /// <summary>Get the live leaderboard for a contest.</summary>
    [HttpGet("{contestId:guid}/leaderboard")]
    public async Task<IActionResult> GetLeaderboard(Guid contestId, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(new GetLeaderboardQuery(contestId), ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    /// <summary>Create a new contest (Admin only).</summary>
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create(CreateContestRequest req, CancellationToken ct)
    {
        var id = await mediator.Send(
            new CreateContestCommand(
                req.Title,
                req.Description,
                req.StartTime,
                req.EndTime,
                req.ProblemIds), ct);
        return CreatedAtAction(nameof(GetLeaderboard), new { contestId = id }, new { id });
    }
}

public sealed record CreateContestRequest(
    string       Title,
    string       Description,
    DateTime     StartTime,
    DateTime     EndTime,
    List<Guid>   ProblemIds
);
