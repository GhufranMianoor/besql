using System.Net;
using System.Text.Json;

namespace BeSQL.WebAPI.Middleware;

/// <summary>Global exception handler that converts exceptions to RFC 7807 problem details.</summary>
public sealed class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            await WriteProblemAsync(ctx, ex);
        }
    }

    private static Task WriteProblemAsync(HttpContext ctx, Exception ex)
    {
        var (status, title) = ex switch
        {
            KeyNotFoundException       => (HttpStatusCode.NotFound,           "Resource not found."),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized,      "Unauthorized."),
            InvalidOperationException  => (HttpStatusCode.BadRequest,         ex.Message),
            _                          => (HttpStatusCode.InternalServerError, "An unexpected error occurred."),
        };

        ctx.Response.StatusCode  = (int)status;
        ctx.Response.ContentType = "application/problem+json";

        return ctx.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            status = (int)status,
            title,
        }));
    }
}
