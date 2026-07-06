using Mkc.Copilot.Extensions.Core.Autopilot;
using Mkc.Copilot.Extensions.Core.Bridge;
using Mkc.Copilot.Extensions.Core.Infrastructure;
using Mkc.Copilot.Extensions.Core.State;
using Mkc.Copilot.Extensions.Sentinel;

var store = StateStore.FromEnvironment();
var cwd = Environment.GetEnvironmentVariable("MKC_CWD") ?? Environment.CurrentDirectory;
var head = new SentinelExtension(
    store,
    new ModeContract(store.RootDir, SystemClock.Instance),
    new ModeDetector(),
    new Checkpointer(store, cwd));
return await ExtensionRunner.RunAsync(head, args);
