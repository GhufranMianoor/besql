using BeSQL.Application.Features.Problems.Commands;
using BeSQL.Application.Features.Problems.Queries;
using BeSQL.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BeSQL.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ProblemsController(IMediator mediator) : ControllerBase
{
    /// <summary>List all published problems (filterable by difficulty/tag).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Difficulty? difficulty,
        [FromQuery] string?     tag,
        [FromQuery] int         page     = 1,
        [FromQuery] int         pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(
            new GetProblemsQuery(difficulty, tag, page, pageSize), ct);
        return Ok(result);
    }

    /// <summary>Create a new problem (Admin only).</summary>
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create(
        CreateProblemRequest req,
        CancellationToken ct = default)
    {
        var id = await mediator.Send(
            new CreateProblemCommand(
                req.Title,
                req.Description,
                req.Difficulty,
                req.InitScript,
                req.GoldenSolution,
                req.Tags), ct);
        return CreatedAtAction(nameof(GetAll), new { id }, new { id });
    }
}

public sealed record CreateProblemRequest(
    string       Title,
    string       Description,
    Difficulty   Difficulty,
    string       InitScript,
    string       GoldenSolution,
    List<string> Tags
);
