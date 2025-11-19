using System.IO.Compression;
using Elements.Core;
using FrooxEngine;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using SkyFrost.Base;

namespace ReactReso.Templates;

public class ResoPackageUtils
{
    public static DataTreeDictionary LoadPackage(string fileName)
    {
        using var react = File.OpenRead(fileName);
        using var archive = new ZipArchive(react);
        var main = archive.GetEntry("R-Main.record");

        using var mainStream = main.Open();
        using var mainText = new StreamReader(mainStream);
        using var mainReader = new JsonTextReader(mainText);
        var mainFile = (JObject)JToken.ReadFrom(mainReader);
        var manifestAssetId = mainFile["assetUri"].ToString().Remove(0, 10);

        var manifest = archive.GetEntry($"Assets/{manifestAssetId}");
        using var stream = manifest.Open();

        var tree = DataTreeConverter.LoadAuto(stream);

        return tree;
    }

    public static async Task SavePackage(Engine engine, SavedGraph graph, string fileName, string name)
    {
        using var file = File.Create(fileName);
        await PackageCreator.BuildPackage(engine, new Record
        {
            RecordType = RecordTypes.OBJECT,
            Name = name,
        }, graph, file, false);
    }

    public static void WriteToJson(DataTreeDictionary tree, string fileName)
    {
        using var file = File.Create(fileName);
        DataTreeConverter.ToRawJSON(tree, file);
    }

}