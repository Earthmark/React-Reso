using FrooxEngine;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using ReactReso.Templates;

// This raises a lot of errors due to type construction being complicated sometimes.
// Do this before loading frooxEngine so it doesn't try to listen for those errors.
var nodeArchetypes = ProtoNodeScraper.GetArchetypes();

if (Directory.Exists("./tmp/arch"))
{
    Directory.Delete("./tmp/arch", true);
}
Directory.CreateDirectory("./tmp/arch");

using var reso = await ResoEngine.Create();

using var w = new ResoWorld(reso);

var workspace = w.World.RootSlot.AddSlot("Workspace");

TemplateLibrary library = new()
{
    Archetypes = nodeArchetypes.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.Keys.ToList())
};

int templateCount = 0;
int bucketCount = 0;
int containsCount = 0;
foreach (var (archetypeName, templates) in nodeArchetypes)
{
    foreach (var (templateName, type) in templates)
    {
        try
        {
            var template = ProtoTemplateBuilder.BuildTemplate(workspace, library, type, templateName);
            template.SaveObject(DependencyHandling.BreakAll);
            containsCount++;
            templateCount++;
        }
        catch
        {

        }
    }

    if (containsCount > 1000)
    {
        await reso.SavePackage(workspace, $"./tmp/arch/{bucketCount}.resonitepackage", "node-manifest");

        workspace.DestroyChildren();

        bucketCount++;
        containsCount = 0;
    }
}
if (workspace.ChildrenCount > 0)
{
    await reso.SavePackage(workspace, $"./tmp/arch/{bucketCount}.resonitepackage", "node-manifest");

    workspace.DestroyChildren();

    bucketCount++;
}

Console.WriteLine($"Generated {templateCount} templates in {bucketCount} buckets");

File.WriteAllText("library.json", JObject.FromObject(library).ToString(Formatting.Indented));
