using Mkc.Copilot.Extensions.Core.State;

namespace Mkc.Copilot.Extensions.Tests;

[Trait("Category", "Integration")]
public class CheckpointerTests : IAsyncLifetime
{
    private string _repo = "";

    public async Task InitializeAsync()
    {
        _repo = Path.Combine(Path.GetTempPath(), "mkc-cp-" + Guid.NewGuid().ToString("n"));
        Directory.CreateDirectory(_repo);
        await GitRunner.RunAsync(_repo, ["init", "-q"], default);
        await GitRunner.RunAsync(_repo, ["config", "user.email", "t@t.de"], default);
        await GitRunner.RunAsync(_repo, ["config", "user.name", "t"], default);
        await File.WriteAllTextAsync(Path.Combine(_repo, "a.txt"), "one\n");
        await GitRunner.RunAsync(_repo, ["add", "."], default);
        await GitRunner.RunAsync(_repo, ["commit", "-q", "-m", "init"], default);
    }

    public Task DisposeAsync()
    {
        try { Directory.Delete(_repo, recursive: true); } catch { /* egal */ }
        return Task.CompletedTask;
    }

    [Fact]
    public async Task Creates_Checkpoint_With_Patch_For_Dirty_Tree()
    {
        await File.WriteAllTextAsync(Path.Combine(_repo, "a.txt"), "one\ntwo\n");
        var store = new StateStore(Path.Combine(_repo, ".copilot", "state"));
        var cp = new Checkpointer(store, _repo);

        var checkpoint = await cp.CreateAsync("test", default);

        Assert.Equal(1, checkpoint.Number);
        Assert.NotNull(checkpoint.PatchFile);
        Assert.True(File.Exists(checkpoint.PatchFile));
        Assert.Single(cp.List());
    }

    [Fact]
    public async Task Restore_File_Brings_Back_Committed_Content()
    {
        var store = new StateStore(Path.Combine(_repo, ".copilot", "state"));
        var cp = new Checkpointer(store, _repo);
        var checkpoint = await cp.CreateAsync("clean", default); // Working Tree sauber ⇒ HEAD-Sha

        await File.WriteAllTextAsync(Path.Combine(_repo, "a.txt"), "MODIFIED\n");
        var result = await cp.RestoreFileAsync(checkpoint, "a.txt", default);

        Assert.True(result.Success);
        Assert.Equal("one\n", await File.ReadAllTextAsync(Path.Combine(_repo, "a.txt")));
    }
}
