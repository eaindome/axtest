namespace Axtest.Api.DTOs;

public record EnvironmentDto(
    string Name,
    string? BaseUrl,
    bool UseProductionFallback,
    string EffectiveUrl,
    bool Configured
);

public record UpsertEnvironmentRequest(
    string? BaseUrl,
    bool UseProductionFallback
);
