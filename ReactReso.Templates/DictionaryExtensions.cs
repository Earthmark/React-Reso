namespace ReactReso.Templates;

public static class DictionaryExtensions
{
    public static TValue GetOrAdd<TKey, TValue>(this IDictionary<TKey, TValue> dict, TKey key) where TValue : new()
    {
        if (!dict.TryGetValue(key, out var val))
        {
            dict.Add(key, val = new TValue());
        }
        return val;
    }

    public static TValue GetOrAdd<TKey, TValue>(this IDictionary<TKey, TValue> dict, TKey key, TValue ifNotExist)
    {
        if (!dict.TryGetValue(key, out var val))
        {
            dict.Add(key, val = ifNotExist);
        }
        return val;
    }

    public static TValue GetOrAdd<TKey, TValue>(this IDictionary<TKey, TValue> dict, TKey key, Func<TValue> valueFactory)
    {
        if (!dict.TryGetValue(key, out var val))
        {
            dict.Add(key, val = valueFactory());
        }
        return val;
    }
}
