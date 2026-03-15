using BeSQL.Application.Common.Interfaces;
using BeSQL.Domain.Entities;
using BeSQL.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace BeSQL.Application.Features.Auth.Commands;

public sealed class RegisterCommandHandler(
    IApplicationDbContext db,
    IPasswordHasher       hasher,
    ITokenService         tokenService
) : IRequestHandler<RegisterCommand, AuthResult>
{
    public async Task<AuthResult> Handle(RegisterCommand req, CancellationToken ct)
    {
        if (await db.Users.AnyAsync(u => u.Username == req.Username, ct))
            throw new InvalidOperationException("Username already taken.");

        if (await db.Users.AnyAsync(u => u.Email == req.Email, ct))
            throw new InvalidOperationException("Email already registered.");

        var user = new User
        {
            Username     = req.Username,
            Email        = req.Email,
            PasswordHash = hasher.Hash(req.Password),
            Role         = UserRole.Contestant,
        };

        db.Users.Add(user);

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
