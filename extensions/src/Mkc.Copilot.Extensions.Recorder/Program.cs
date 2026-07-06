using Mkc.Copilot.Extensions.Core.Bridge;
using Mkc.Copilot.Extensions.Core.State;
using Mkc.Copilot.Extensions.Core.Telemetry;
using Mkc.Copilot.Extensions.Core.Workflow;
using Mkc.Copilot.Extensions.Recorder;

var store = StateStore.FromEnvironment();
var head = new RecorderExtension(
    new UsageAggregator(store, PriceTable.Load()),
    new DenyLog(store),
    new WorkflowEngine(store, new Gates()));
return await ExtensionRunner.RunAsync(head, args);
