using FrooxEngine;

namespace ReactReso.Templates;

public class ProxyBuilder
{
    public Slot Template { get; }
    public Slot Proxy { get; }

    public TemplateMetadata Metadata { get; }

    public delegate void BuildProxyBinding(Slot proxy);

    public ProxyBuilder(Slot template, TemplateLibrary library, Slot childContainer = null)
    {
        Template = template;

        var proxy = template.AddSlot("*NO_ELEMENT_ID*");
        proxy.Tag = "element-proxy";
        Proxy = proxy;

        RefProp(Template, "__this");
        RefProp(Proxy, "__proxy");

        if (childContainer != null)
        {
            RefProp(childContainer, "__children");
            Metadata.Children = true;
        }

        // Populate these after the above block, as we don't want those three props declared.
        library.Templates.Add(template.Name, Metadata = new TemplateMetadata());
        if (childContainer != null)
        {
            Metadata.Children = true;
        }
    }

    public void SetRefProp<T>(SyncRef<T> input, string nameOverride = null, T defaultTarget = default) where T : class, IWorldElement
    {
        var dyn = DynRefDriver(input);
        dyn.DefaultTarget.Target = defaultTarget;

        var name = nameOverride ?? input.Name;
        PropDynNameBinder(name, dyn.VariableName);

        Metadata?.AddSetProp<T>(name);
    }

    public void SetValProp<T>(IField<T> input, string nameOverride = null, T defaultValue = default)
    {
        var dyn = DynValDriver(input);
        dyn.DefaultValue.Value = defaultValue;

        var name = nameOverride ?? input.Name;
        PropDynNameBinder(name, dyn.VariableName);

        Metadata?.AddSetProp<T>(name);
    }

    public void RefProp<T>(T input, string nameOverride = null) where T : class, IWorldElement
    {
        var dyn = DynRef(input);

        var name = nameOverride ?? input.Name;
        PropDynNameBinder(name, dyn.VariableName);

        Metadata?.AddRefProp<T>(name);
    }

    void PropDynNameBinder(string name, IField<string> dynNameField)
    {
        var driver = Attach<StringConcatenationDriver>();
        driver.TargetString.Target = dynNameField;
        driver.Separator.Value = ".";

        driver.Strings.Clear();

        ValCopy(Proxy.NameField, driver.Strings.Add());

        driver.Strings.Add(name);
    }

    ValueCopy<T> ValCopy<T>(IField<T> src, IField<T> dest)
    {
        var copy = Attach<ValueCopy<T>>();
        copy.Source.Target = src;
        copy.Target.ForceLink(dest);
        return copy;
    }

    DynamicValueVariableDriver<T> DynValDriver<T>(IField<T> target)
    {
        var dyn = Attach<DynamicValueVariableDriver<T>>();
        dyn.Target.Target = target;
        return dyn;
    }


    DynamicReferenceVariableDriver<T> DynRefDriver<T>(SyncRef<T> target) where T : class, IWorldElement
    {
        var dyn = Attach<DynamicReferenceVariableDriver<T>>();
        dyn.Target.Target = target;
        return dyn;
    }

    DynamicReferenceVariable<T> DynRef<T>(T target) where T : class, IWorldElement
    {
        var dyn = Attach<DynamicReferenceVariable<T>>();
        dyn.Reference.Target = target;
        return dyn;
    }

    T Attach<T>() where T : Component, new()
    {
        return Proxy.AttachComponent<T>();
    }
}