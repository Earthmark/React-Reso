using FrooxEngine;
using ProtoFlux.Runtimes.Execution.Nodes.Math;

namespace ReactReso.Templates;

public class ResoEngine : IDisposable
{
    public Engine Engine { get; private set; }

    private bool disposedValue_;

    public void WithWorld(Action<World> action)
    {
        var world = Engine.WorldManager.StartLocal(null);
        try
        {
            world.ConnectorManager.ImplementerLock(Thread.CurrentThread);
            action(world);
        }
        finally
        {
            world.ConnectorManager.ImplementerUnlock();
        }
        world.Destroy();
    }

    public async Task SavePackage(Slot slot, string fileName, string name)
    {
        var tree = slot.SaveObject(DependencyHandling.BreakAll);
        await ResoPackageUtils.SavePackage(Engine, tree, fileName, name);
    }

    private ResoEngine()
    {
        Engine = new Engine();
    }

    private class InternalResources : IInternalResource
    {
        public Task<System.IO.Stream> ReadBinaryResource(string path)
        {
            throw new NotImplementedException();
        }

        public Task<string> ReadTextResource(string path)
        {
            throw new NotImplementedException();
        }
    }

    private class EngineProgress : IEngineInitProgress
    {
        public int FixedPhaseIndex { get; set; }

        public void EngineReady()
        {
            Console.WriteLine("Engine Ready");
        }

        public void SetFixedPhase(string phase)
        {
            Console.WriteLine($"Phase: {phase}");
        }

        public void SetSubphase(string subphase, bool alwaysShow = false)
        {
            Console.WriteLine($"Subphase: {subphase}");
        }
    }

    public static async Task<ResoEngine> Create(params string[] args)
    {
        // Do not remove this or the referenced assemblies don't load.
        // Froox engine loads all currently referenced assemblies and
        // reflects types to find what 'core' types exist.
        // This only happens once, if types arn't in the AppDomain,
        // they're not considered 'core' and will cause runtime errors if they are serialized.
#pragma warning disable CS0219 // Variable is assigned but its value is never used
        TangentPointColor load_bearing_variable = new();
#pragma warning restore CS0219 // Variable is assigned but its value is never used

        var opts = new LaunchOptions
        {
            DoNotAutoLoadHome = true,
            CloudProfile = CloudProfile.Local,
            CacheDirectory = "./tmp/cache",
            DataDirectory = "./tmp/data",
        };
        opts.Parse(args);
        var systemInfo = new StandaloneSystemInfo();
        var progress = new EngineProgress();

        var bootstrapper = new ResoEngine();
        await bootstrapper.Engine.Initialize("./tmp", opts, systemInfo, new InternalResources(), progress);
        return bootstrapper;
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!disposedValue_)
        {
            if (disposing)
            {
                Engine.Dispose();
            }
            disposedValue_ = true;
        }
    }

    public void Dispose()
    {
        Dispose(disposing: true);
        GC.SuppressFinalize(this);
    }
}