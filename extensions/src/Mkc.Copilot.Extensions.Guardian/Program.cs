using Mkc.Copilot.Extensions.Core.Autopilot;
using Mkc.Copilot.Extensions.Core.Bridge;
using Mkc.Copilot.Extensions.Core.Infrastructure;
using Mkc.Copilot.Extensions.Core.State;
using Mkc.Copilot.Extensions.Guardian;

var store = StateStore.FromEnvironment();
var head = new GuardianExtension(
    store,
    new ModeContract(store.RootDir, SystemClock.Instance),
    DefaultPolicy.Load());
return await ExtensionRunner.RunAsync(head, args);
