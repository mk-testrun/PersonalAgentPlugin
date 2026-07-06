namespace Mkc.Copilot.Extensions.Core.Workflow;

/// <summary>Eine benannte Workflow-Definition (feature, bugfix, …) als geordnete Step-Liste.</summary>
public sealed class WorkflowDefinition
{
    public string Name { get; }
    public IReadOnlyList<StepMeta> Steps { get; }

    private WorkflowDefinition(string name, IReadOnlyList<StepMeta> steps)
    {
        Name = name;
        Steps = steps;
    }

    public StepMeta? Step(string id) => Steps.FirstOrDefault(s => s.Id == id);
    public int IndexOf(string id) => Steps.ToList().FindIndex(s => s.Id == id);

    public static Builder Define(string name) => new(name);

    public sealed class Builder(string name)
    {
        private readonly List<StepMeta> _steps = [];

        public Builder Step(string id, string title, StepKind kind = StepKind.Dev,
            bool optional = false, bool skippable = false, bool autopilotAllowed = true,
            string[]? gates = null, string[]? produces = null, string? after = null)
        {
            _steps.Add(new StepMeta
            {
                Id = id, Title = title, Kind = kind, Optional = optional, Skippable = skippable,
                AutopilotAllowed = autopilotAllowed, Gates = gates ?? [], Produces = produces ?? [],
                After = after ?? (_steps.Count > 0 ? _steps[^1].Id : null),
            });
            return this;
        }

        public WorkflowDefinition Build() => new(name, _steps);
    }
}
