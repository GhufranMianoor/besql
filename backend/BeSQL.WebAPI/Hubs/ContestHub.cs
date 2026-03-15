using BeSQL.Application.Features.Contests.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BeSQL.WebAPI.Hubs;

/// <summary>
/// SignalR hub for real-time contest features:
///  - Live leaderboard pushes
///  - Submission status updates
/// </summary>
[Authorize]
public sealed class ContestHub(IMediator mediator) : Hub
{
    /// <summary>Join a contest's leaderboard group.</summary>
    public async Task JoinContest(string contestId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"contest-{contestId}");

        // Push the current leaderboard immediately on join
        if (Guid.TryParse(contestId, out var id))
        {
            var leaderboard = await mediator.Send(new GetLeaderboardQuery(id));
            await Clients.Caller.SendAsync("LeaderboardUpdate", leaderboard);
        }
    }

    /// <summary>Leave a contest group.</summary>
    public async Task LeaveContest(string contestId) =>
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"contest-{contestId}");

    /// <summary>
    /// Called by the server (not the client) after each accepted submission to
    /// broadcast the updated leaderboard.
    /// </summary>
    public static async Task BroadcastLeaderboardAsync(
        IHubContext<ContestHub> hub,
        LeaderboardResult       leaderboard)
    {
        await hub.Clients
            .Group($"contest-{leaderboard.ContestId}")
            .SendAsync("LeaderboardUpdate", leaderboard);
    }
}
