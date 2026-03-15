using BeSQL.Application.Common.Interfaces;
using BeSQL.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace BeSQL.Application.Features.Auth.Commands;

public sealed class LoginCommandHandler(
    IApplicationDbContext db,
    IPasswordHasher       hasher,
    ITokenService         tokenService
) : IRequestHandler<LoginCommand, AuthResult>
{
    public async Task<AuthResult> Handle(LoginCommand req, CancellationToken ct)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Username == req.Username, ct)
            ?? throw new UnauthorizedAccessException("Invalid credentials.");

        if (!hasher.Verify(req.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid credentials.");

        // Revoke old refresh tokens for this user (token rotation)
        var old = await db.RefreshTokens
            .Where(t => t.UserId == user.Id && !t.IsRevoked)
            .ToListAsync(ct);
        old.ForEach(t => t.IsRevoked = true);

        var refreshToken = new RefreshToken
        {
            UserId    = user.Id,
            Token     = tokenService.GenerateRefreshToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
        };
        db.RefreshTokens.Add(refreshToken);
        await db.SaveChangesAsync(ct);

        return new AuthResult(
            tokenService.GenerateAccessToken(user),
            refreshToken.Token,
            user.Username,
            user.Role.ToString()
        );
    }
}
