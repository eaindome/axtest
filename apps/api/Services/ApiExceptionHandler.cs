using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Axtest.Api.Services;

public class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var status = exception switch {
            ArgumentException => 400,
            OperationCanceledException => 504,
            KeyNotFoundException => 404,
            ResourceConflictException => 409,
            DbUpdateException { InnerException: PostgresException { SqlState: "23505" } } => 409,
            _ => 500
        };
        var detail = status == 500 ? "An unexpected error occurred. Check the server logs." :
            exception is DbUpdateException ? "A resource with this name already exists." : exception.Message;
        if (status == 500) logger.LogError("API request failed ({ExceptionType}).", exception.GetType().Name);
        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(new ProblemDetails { Status = status, Title = detail }, ct);
        return true;
    }
}
