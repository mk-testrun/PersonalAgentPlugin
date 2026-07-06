using Mkc.Copilot.Extensions.Core.Autopilot;
using Mkc.Copilot.Extensions.Core.Backends;
using Mkc.Copilot.Extensions.Core.Bridge;
using Mkc.Copilot.Extensions.Core.Infrastructure;
using Mkc.Copilot.Extensions.Core.Pii;
using Mkc.Copilot.Extensions.Core.State;
using Mkc.Copilot.Extensions.Core.Workflow;
using Mkc.Copilot.Extensions.Core.Workflow.Meta;
using Mkc.Copilot.Extensions.Flow;

var store = StateStore.FromEnvironment();
var cwd = Environment.GetEnvironmentVariable("MKC_CWD") ?? Environment.CurrentDirectory;
var remoteConfig = RemoteConfig.FromEnvironment();
var head = new FlowExtension(
    new ModeContract(store.RootDir, SystemClock.Instance),
    new WorkflowEngine(store, new Gates()),
    new BackendModeStore(store),
    new PiiScrubber(store),
    cwd,
    remoteConfig,
    scrubber => remoteConfig.AdoComplete
        ? new AdoBackend(RestClient.WithBasicAuth("", remoteConfig.AdoPat!), remoteConfig, scrubber)
        : null,
    new GoalTracker(store, cwd),
    new LoopRunner(store),
    new BatchRunner(store),
    store);
return await ExtensionRunner.RunAsync(head, args);
