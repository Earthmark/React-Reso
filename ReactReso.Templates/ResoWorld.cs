using FrooxEngine;

namespace ReactReso.Templates;

public class ResoWorld : IDisposable
{
    private bool disposedValue;

    public World World { get; }

    public ResoWorld(ResoEngine engine)
    {
        World = engine.Engine.WorldManager.StartLocal(null);
        World.ConnectorManager.ImplementerLock(Thread.CurrentThread);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!disposedValue)
        {
            if (disposing)
            {
                World.ConnectorManager.ImplementerUnlock();
                World.Destroy();
            }
            disposedValue = true;
        }
    }

    public void Dispose()
    {
        Dispose(disposing: true);
        GC.SuppressFinalize(this);
    }
}