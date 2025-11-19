using Elements.Core;
using FrooxEngine;
using Newtonsoft.Json;

namespace ReactReso.Templates;

public class TemplateProp
{
    [JsonProperty("ref", DefaultValueHandling = DefaultValueHandling.Ignore)]
    public string Ref { get; set; }

    [JsonProperty("set", DefaultValueHandling = DefaultValueHandling.Ignore)]
    public string Set { get; set; }

    private static readonly Dictionary<Type, string> WellKnownTypes = new(){
        {typeof(int), "int"},
        {typeof(int2), "int2"},
        {typeof(int3), "int3"},
        {typeof(int4), "int4"},
        {typeof(float), "float"},
        {typeof(float2), "float2"},
        {typeof(float3), "float3"},
        {typeof(float4), "float4"},
        {typeof(floatQ), "floatQ"},
        {typeof(color), "color"},
        {typeof(string), "string"},
        {typeof(bool), "bool"},
        {typeof(ColliderType), "ColliderType"},
    };

    public static string ToType<T>()
    {
        if (typeof(T).IsAssignableTo(typeof(IWorldElement)))
        {
            return typeof(T).GetNiceName();
        }

        return WellKnownTypes[typeof(T)];
    }

    public void AddSet<T>() => Set = ToType<T>();

    public void AddRef<T>() => Ref = ToType<T>();
}

public class TemplateMetadata
{
    [JsonProperty("children", DefaultValueHandling = DefaultValueHandling.Ignore)]
    public bool Children { get; set; }

    [JsonProperty("props", DefaultValueHandling = DefaultValueHandling.Ignore)]
    public Dictionary<string, TemplateProp> Props { get; set; } = [];


    private TemplateProp GetOrAddProp<T>(string name) =>
        !Props.TryGetValue(name, out var val)
            ? (Props[name] = new TemplateProp())
            : val;

    public void AddSetProp<T>(string name) => GetOrAddProp<T>(name).AddSet<T>();

    public void AddRefProp<T>(string name) => GetOrAddProp<T>(name).AddRef<T>();
}

public class TemplateLibrary
{
    [JsonProperty("templates", DefaultValueHandling = DefaultValueHandling.Ignore)]
    public Dictionary<string, TemplateMetadata> Templates { get; set; } = [];

    [JsonProperty("archetypes", DefaultValueHandling = DefaultValueHandling.Ignore)]
    public Dictionary<string, List<string>> Archetypes { get; set; } = [];
}
