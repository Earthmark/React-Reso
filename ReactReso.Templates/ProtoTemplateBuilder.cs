using System.Collections.Concurrent;
using FrooxEngine;
using FrooxEngine.ProtoFlux;

namespace ReactReso.Templates;

public class ProtoTemplateBuilder
{
    public static Slot BuildTemplate(Slot workspace, TemplateLibrary library, Type nodeType, string name)
    {
        Console.WriteLine($"Templating {name}");
        var template = workspace.AddSlot(name);

        var node = (ProtoFluxNode)template.AttachComponent(nodeType);

        var bldr = new ProxyBuilder(template, library);

        foreach (var input in node.AllInputs)
        {
            MakeInputProp(bldr, input);
        }
        foreach (var output in node.NodeOutputs)
        {
            MakeOutputProp(bldr, output, node);
        }
        foreach (var impulse in node.AllImpulses)
        {
            MakeOpOutputProp(bldr, (SyncRef<INodeOperation>)impulse);
        }
        foreach (var impulse in node.NodeOperations)
        {
            MakeOpInputProp(bldr, impulse, node);
        }

        return template;
    }

    private static void MakeOpInputProp(ProxyBuilder builder, INodeOperation input, ProtoFluxNode component)
    {
        builder.RefProp(input, input == component ? "self" : null);
    }

    private static void MakeOpOutputProp(ProxyBuilder builder, SyncRef<INodeOperation> output)
    {
        builder.SetRefProp(output);
    }

    private static readonly ConcurrentDictionary<Type, Action<ProxyBuilder, ISyncRef, string>> InputGenerators = new();

    private static Type GetNodeOutputInterface(Type outputType)
    {
        foreach (var i in outputType.GetInterfaces())
        {
            if (!i.IsGenericType)
            {
                continue;
            }

            var genType = i.GetGenericTypeDefinition();
            if (genType == typeof(INodeValueOutput<>) || genType == typeof(INodeObjectOutput<>))
            {
                return i;
            }
        }
        throw new NotSupportedException($"{outputType.FullName} did not implement an output interface.");
    }

    private static void MakeInputProp(ProxyBuilder builder, ISyncRef input)
    {
        var targetOutput = GetNodeInputInterface(input.GetType());
        InputGenerators.GetOrAdd(targetOutput, MakeInputGenerator)(builder, input, null);
    }

    private static Type GetNodeInputInterface(Type inputType)
    {
        if (inputType.GetGenericTypeDefinition() != typeof(SyncRef<>))
        {
            throw new NotSupportedException($"{inputType} was not a sync ref.");
        }
        return inputType.GetGenericArguments()[0];
    }

    private static Action<ProxyBuilder, ISyncRef, string> MakeInputGenerator(Type fieldType)
    {
        var makeSetProp = typeof(ProxyBuilder).GetMethod(nameof(ProxyBuilder.SetRefProp));
        var method = makeSetProp.MakeGenericMethod(fieldType);

        return (builder, syncRef, name) => method.Invoke(builder, [syncRef, name, null]);
    }

    private static readonly ConcurrentDictionary<Type, Action<ProxyBuilder, INodeOutput, string>> OutputGenerators = new();

    private static void MakeOutputProp(ProxyBuilder builder, INodeOutput output, ProtoFluxNode component)
    {
        var targetOutput = GetNodeOutputInterface(output.GetType());
        OutputGenerators.GetOrAdd(targetOutput, MakeOutputGenerator)(builder, output, output == component ? "self" : null);
    }

    private static Action<ProxyBuilder, INodeOutput, string> MakeOutputGenerator(Type fieldType)
    {
        var makeSetProp = typeof(ProxyBuilder).GetMethod(nameof(ProxyBuilder.RefProp));

        var method = makeSetProp.MakeGenericMethod(fieldType);

        return (builder, output, name) => method.Invoke(builder, [output, name]);
    }

    private static readonly ConcurrentDictionary<Type, Action<ProxyBuilder, IInput, string>> ValueInputGenerators = new();

    private static Type GetValueInputInterface(Type outputType)
    {
        foreach (var i in outputType.GetInterfaces())
        {
            if (!i.IsGenericType)
            {
                continue;
            }

            var genType = i.GetGenericTypeDefinition();
            if (genType == typeof(IInput<>))
            {
                return i;
            }
        }
        throw new NotSupportedException($"{outputType.FullName} did not implement an output interface.");
    }
    private static void MakeValueInputProp(ProxyBuilder builder, IInput output, ProtoFluxNode component)
    {
        var targetOutput = GetValueInputInterface(output.GetType());
        ValueInputGenerators.GetOrAdd(targetOutput, ValueInputGenerator)(builder, output, output == component ? "self" : null);
    }

    private static Action<ProxyBuilder, IInput, string> ValueInputGenerator(Type fieldType)
    {
        var makeSetProp = typeof(ProxyBuilder).GetMethod(nameof(ProxyBuilder.SetValProp));

        var method = makeSetProp.MakeGenericMethod(fieldType);

        return (builder, output, name) => method.Invoke(builder, [output, name]);
    }
}
