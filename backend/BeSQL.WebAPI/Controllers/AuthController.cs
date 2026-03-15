using BeSQL.Application.Features.Auth.Commands;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BeSQL.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController(IMediator mediator) : ControllerBase
{
    /// <summary>Register a new contestant account.</summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(
                new RegisterCommand(req.Username, req.Email, req.Password), ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    /// <summary>Sign in and receive a JWT access + refresh token pair.</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(
                new LoginCommand(req.Username, req.Password), ct);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { error = "Invalid credentials." });
        }
    }

    /// <summary>Exchange a refresh token for a new token pair.</summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(RefreshRequest req, CancellationToken ct)
    {
        try
        {
            var result = await mediator.Send(
                new RefreshTokenCommand(req.RefreshToken), ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }
}

public sealed record RegisterRequest(string Username, string Email, string Password);
public sealed record LoginRequest(string Username, string Password);
public sealed record RefreshRequest(string RefreshToken);
