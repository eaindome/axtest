using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
namespace Axtest.Api.Services;
public class ApiErrorResultFilter : IResultFilter
{
    public void OnResultExecuting(ResultExecutingContext context)
    {
        if (context.Result is ObjectResult { StatusCode: >= 400, Value: string message } result)
            context.Result = new ObjectResult(new ProblemDetails { Status = result.StatusCode, Title = message }) { StatusCode = result.StatusCode };
    }
    public void OnResultExecuted(ResultExecutedContext context) { }
}
public class ResourceConflictException(string message) : Exception(message);
