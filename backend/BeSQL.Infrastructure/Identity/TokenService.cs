using BeSQL.Application.Common.Interfaces;
using BeSQL.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace BeSQL.Infrastructure.Identity;

/// <summary>
/// Generates JWT access tokens and manages refresh token rotation.
/// </summary>
public sealed class TokenService(
    IOptions<JwtOptions>  opts,
    IApplicationDbContext db
) : ITokenService
{
    public string GenerateAccessToken(User user)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(opts.Value.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,  user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Name, user.Username),
            new Claim(ClaimTypes.Role,              user.Role.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti,  Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:    opts.Value.Issuer,
            audience:  opts.Value.Audience,
            claims:    claims,
            expires:   DateTime.UtcNow.AddMinutes(opts.Value.AccessTokenMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    public async Task<(string AccessToken, string NewRefreshToken)> RotateTokensAsync(
        string refreshToken,
        CancellationToken ct = default)
    {
        var existing = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == refreshToken && !t.IsRevoked, ct)
            ?? throw new SecurityTokenException("Invalid or expired refresh token.");

        if (existing.ExpiresAt < DateTime.UtcNow)
        {
            existing.IsRevoked = true;
            await db.SaveChangesAsync(ct);
            throw new SecurityTokenException("Refresh token has expired.");
        }

        var user = await db.Users.FindAsync([existing.UserId], ct)
            ?? throw new SecurityTokenException("User not found.");

        existing.IsRevoked = true;

        var newRefreshToken = new RefreshToken
        {
            UserId    = user.Id,
            Token     = GenerateRefreshToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
        };
        db.RefreshTokens.Add(newRefreshToken);
        await db.SaveChangesAsync(ct);

        return (GenerateAccessToken(user), newRefreshToken.Token);
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var token = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == refreshToken, ct);
        if (token is not null)
        {
            token.IsRevoked = true;
            await db.SaveChangesAsync(ct);
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────────────

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string SecretKey           { get; set; } = string.Empty;
    public string Issuer              { get; set; } = "besql";
    public string Audience            { get; set; } = "besql";
    public int    AccessTokenMinutes  { get; set; } = 15;
}
