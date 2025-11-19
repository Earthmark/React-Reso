using System.Reflection;
using Elements.Core;
using FrooxEngine;
using FrooxEngine.ProtoFlux;
using FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Actions;

namespace ReactReso.Templates;

public static class ProtoNodeScraper
{
    private static bool SpawnableProto(Type type)
    {
        return typeof(ProtoFluxNode).IsAssignableFrom(type) &&
                        // Ignore thunks
                        !type.Name.Contains("_0") &&
                        !type.IsAbstract &&
                        !OmittedTypes.Contains(type);
    }

    private static string GetGroupingKey(string typeName)
    {
        return typeName.Split("_")[0].Split("`")[0].Split("'")[0];
    }

    private static string NodeName(Type type)
    {
        return ForceRenamedNodes.TryGetValue(type, out var rename) ? rename : type.Name;
    }

    private static readonly Dictionary<Type, string> ForceRenamedNodes = [];

    private static void AddRename<T>(string name) =>
        ForceRenamedNodes.Add(typeof(T), name);

    private static readonly HashSet<Type> OmittedTypes = [];

    private static void AddOmitted(Type type) =>
        OmittedTypes.Add(type);
    static ProtoNodeScraper()
    {
        AddRename<FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Strings.NewLine>("NewLine_String");
        AddRename<FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Strings.Characters.NewLine>("NewLine_Char");
        AddRename<FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Strings.ToUpper>("ToUpper_String");
        AddRename<FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Strings.Characters.ToUpper>("ToUpper_Char");
        AddRename<FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Strings.ToLower>("ToLower_String");
        AddRename<FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Strings.Characters.ToLower>("ToLower_Char");
    }

    private static string ConstructGenericType(Type genericType, Type subtype)
    {
        return $"{GetGroupingKey(NodeName(genericType))}_{NodeName(subtype)}";
    }

    private static IEnumerable<(Type Type, string Name)> ExpandGenericTypes(Type type)
    {
        if (!type.IsGenericType)
        {
            yield return (type, NodeName(type));
        }
        else if (type.GenericTypeArguments.Length > 1)
        {
            Console.WriteLine($"Skipping type with more than one argument: {type.FullName}");
        }
        else
        {
            var attr = type.GetCustomAttribute<GenericTypesAttribute>();
            if (attr != null)
            {
                bool typeConstructed = false;
                foreach (var typeArg in attr.Types)
                {
                    // Only check the first arg, because the first arg indicates the most.
                    var arg = type.GetGenericArguments()[0];

                    bool assignableTo = arg.IsAssignableTo(typeArg);
                    bool assignableFrom = arg.IsAssignableFrom(typeArg);

                    bool unmanagedConstraint = arg.GenericParameterAttributes == (GenericParameterAttributes.NotNullableValueTypeConstraint | GenericParameterAttributes.DefaultConstructorConstraint);
                    if (unmanagedConstraint && !typeArg.IsValueType)
                    {
                        continue;
                    }

                    bool refConstraint = arg.GenericParameterAttributes == GenericParameterAttributes.ReferenceTypeConstraint;
                    if (refConstraint && typeArg.IsValueType)
                    {
                        continue;
                    }

                    var consts = arg.GetGenericParameterConstraints();
                    if (consts.Length > 0 && consts.Any(c => c.IsAssignableTo(typeof(ProtoFlux.Runtimes.Execution.ExecutionContext))))
                    {
                        continue;
                    }


                    Type constructedType = null;
                    try
                    {
                        if (consts.Length > 0 && consts.Any(c => c.IsAssignableTo(typeof(ISphericalHarmonics))))
                        {
                            continue;
                        }
                        else
                        {
                            constructedType = type.MakeGenericType(typeArg);
                        }
                    }
                    catch 
                    {
                        Console.WriteLine($"Error while attempting to construct generic:\n\t{type.FullName}<{typeArg.FullName}>");
                    }
                    if (constructedType != null)
                    {

                        var isValidProp = constructedType.GetProperty("IsValidGenericType", BindingFlags.Static | BindingFlags.Public);
                        if (isValidProp != null && !(bool)isValidProp.GetValue(null))
                        {
                            continue;
                        }

                        var name = ConstructGenericType(type, typeArg);
                        typeConstructed = true;
                        yield return (constructedType, name);
                    }
                }
                if (!typeConstructed)
                {
                    Console.WriteLine($"No subtypes constructed for:\n\t{type.FullName}");
                }
            }
            else
            {
                Console.WriteLine($"No type hints for:\n\t{type.FullName}");
            }
        }
    }


    public static Dictionary<string, Dictionary<string, Type>> GetArchetypes()
    {
        Dictionary<string, Dictionary<string, Type>> nodeArchetypes = [];

        foreach (var group in from type in typeof(ValueIncrement<int>).Assembly.GetExportedTypes()
                              where SpawnableProto(type)
                              from concreteType in ExpandGenericTypes(type)
                              group concreteType by GetGroupingKey(concreteType.Name))
        {
            Dictionary<string, Type> archetype = [];
            nodeArchetypes.Add(group.Key, archetype);

            foreach (var (type, name) in group)
            {
                archetype.Add(name, type);
            }
        }

        // Check for cross-archetype name duplicates.
        foreach (var template in from kvp in nodeArchetypes
                                 from template in kvp.Value.Keys
                                 group kvp.Key by template)
        {
            if (template.Count() > 1)
            {
                Console.WriteLine($"Duplicate template between archetypes {string.Join(", ", template)}");
            }
        }

        return nodeArchetypes;
    }

    private static IEnumerable<(Type, string)> SpawnableComponent(Type type)
    {
        if (SpawnableProto(type))
        {
            yield return (type, NodeName(type));
        }
    }
}
