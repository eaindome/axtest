namespace Axtest.Api.Models;

public class ProjectSetup
{
    public long ProjectId { get; set; }
    public string Environment { get; set; } = "production";
    public bool? LoginRequired { get; set; }
    public Guid? LoginFlowId { get; set; }
    public Guid? DefaultAccountId { get; set; }
    public Project Project { get; set; } = null!;
}
