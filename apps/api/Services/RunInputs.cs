using System.Collections.Concurrent;

namespace Axtest.Api.Services;

// Run snapshots remain durable; credentials live only in this API process until claimed.
public class RunInputs
{
    private readonly ConcurrentDictionary<string, (DateTime Expires, Dictionary<string, string> Values)> entries = new();
    public string Store(Dictionary<string, string> values)
    {
        foreach (var entry in entries.Where(e => e.Value.Expires < DateTime.UtcNow)) entries.TryRemove(entry.Key, out _);
        var key = Guid.NewGuid().ToString("N");
        entries[key] = (DateTime.UtcNow.AddHours(1), new(values));
        return key;
    }
    public Dictionary<string, string> Take(string key)
    {
        if (!entries.TryRemove(key, out var entry) || entry.Expires < DateTime.UtcNow)
            throw new ArgumentException("Runtime inputs were lost after a restart or expired. Run the test again and re-enter them.");
        return entry.Values;
    }
    public void Remove(string key) => entries.TryRemove(key, out _);
}
