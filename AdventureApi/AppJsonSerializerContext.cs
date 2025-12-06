using AdventureApi.Dtos;
using System.Text.Json.Serialization;

namespace AdventureApi
{
    [JsonSerializable( typeof( CharacterInfo ) )]
    internal partial class AppJsonSerializerContext : JsonSerializerContext
    {
    }
}
