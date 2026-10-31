using System.Text;
using Axtest.Api.Data;
using Axtest.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ── Database (PostgreSQL / Neon) ──────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection") ?? builder.Configuration.GetConnectionString("Default")));

// ── Authentication (JWT) ──────────────────────────────────────────────────────
var developmentAccess = builder.Configuration.GetValue<bool>("DevelopmentAuth:Enabled");
if (developmentAccess && !builder.Environment.IsDevelopment())
    throw new InvalidOperationException("Development authentication cannot be enabled outside Development.");
if (developmentAccess)
{
    builder.Services.AddAuthentication(DevelopmentIdentity.SchemeName)
        .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, DevelopmentIdentity>(DevelopmentIdentity.SchemeName, _ => { });
}
else
{
    var jwtSecret = builder.Configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret is required.");
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"], ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    });
}

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(opt => opt.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigins)
          .AllowAnyHeader()
          .AllowAnyMethod()));

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ProjectAccess>();
builder.Services.AddScoped<ExplorerService>();
builder.Services.AddSingleton<RunnerProcess>();
if (builder.Configuration.GetValue("Runner:Enabled", builder.Environment.IsDevelopment())) builder.Services.AddHostedService<RunWorker>();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddControllers(options => options.Filters.Add<ApiErrorResultFilter>());
builder.Services.AddOpenApi();

var app = builder.Build();

// ── Auto-migrate on startup ───────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    if (developmentAccess) await DevelopmentIdentity.Seed(db);
}

// ── Middleware ────────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
if (developmentAccess)
    app.MapGet("/api/dev/session", async (AppDbContext db, System.Security.Claims.ClaimsPrincipal principal) =>
    {
        var id = long.Parse(principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        var user = await db.Users.FindAsync(id);
        return Results.Ok(new { token = "local-development", user = new { user!.Id, user.Name, user.Email } });
    }).RequireAuthorization();

app.Run();
