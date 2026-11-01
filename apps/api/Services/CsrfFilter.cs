using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Axtest.Api.Services;

// Controller-only APIs do not register MVC's view-specific antiforgery filter.
public class CsrfFilter(IAntiforgery antiforgery) : IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (HttpMethods.IsGet(context.HttpContext.Request.Method) || HttpMethods.IsHead(context.HttpContext.Request.Method)
            || HttpMethods.IsOptions(context.HttpContext.Request.Method)) return;
        try { await antiforgery.ValidateRequestAsync(context.HttpContext); }
        catch (AntiforgeryValidationException)
        {
            context.Result = new BadRequestObjectResult(new ProblemDetails {
                Status = 400, Title = "Your security token is missing or expired. Refresh the page and try again."
            });
        }
    }
}
