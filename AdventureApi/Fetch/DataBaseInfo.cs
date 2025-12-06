using MySql.Data.MySqlClient;
using System.Data;
using System.Reflection;
using System.Text.Json;

namespace AdventureApi.Fetch
{
    public static class DataBaseInfo
    {
        private static readonly string ConnectionString = Environment.GetEnvironmentVariable( "MYSQL_CONNECTION_STRING" );

        public static string? GetCharInfo ( )
        {
            try {
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };

                using var connection = new MySqlConnection( ConnectionString );
                connection.Open( );

                using var command = connection.CreateCommand( );
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "Charecters_GetAll";

                using var reader = command.ExecuteReader( );
                var results = new List<Dtos.CharacterInfo>( );

                while ( reader.Read( ) ) {
                    var mapped = MapRecordTo<Dtos.CharacterInfo>( reader );
                    results.Add( mapped );
                }

                var outputOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };

                return JsonSerializer.Serialize( results, outputOptions );
            }
            catch ( JsonException ) {
                return null;
            }
            catch ( MySqlException ) {
                return null;
            }
            catch ( Exception ) {
                return null;
            }
        }
        private static T MapRecordTo<T> ( IDataRecord record ) where T : new()
        {
            var obj = new T( );
            var props = typeof( T ).GetProperties( BindingFlags.Public | BindingFlags.Instance )
                                 .Where( p => p.CanWrite )
                                 .ToArray( );

            var propMap = props.ToDictionary( p => p.Name.ToLowerInvariant( ), p => p );

            for ( int i = 0 ; i < record.FieldCount ; i++ ) {
                var colName = record.GetName( i );
                if ( string.IsNullOrEmpty( colName ) ) {
                    continue;
                }

                if ( !propMap.TryGetValue( colName.ToLowerInvariant( ), out var prop ) ) {
                    continue;
                }

                var val = record.GetValue( i );
                if ( val == DBNull.Value ) {
                    prop.SetValue( obj, null );
                    continue;
                }

                var targetType = Nullable.GetUnderlyingType( prop.PropertyType ) ?? prop.PropertyType;

                try {
                    object? safeValue;

                    if ( targetType.IsEnum ) {
                        // handle enum from string or numeric
                        if ( val is string s ) {
                            safeValue = Enum.Parse( targetType, s, ignoreCase: true );
                        }
                        else {
                            safeValue = Enum.ToObject( targetType, val );
                        }
                    }
                    else if ( targetType == typeof( Guid ) ) {
                        safeValue = val is Guid g ? g : Guid.Parse( val.ToString( )! );
                    }
                    else if ( targetType == typeof( DateTimeOffset ) ) {
                        safeValue = val is DateTimeOffset dto ? dto : DateTimeOffset.Parse( val.ToString( )! );
                    }
                    else {
                        safeValue = Convert.ChangeType( val, targetType );
                    }

                    prop.SetValue( obj, safeValue );
                }
                catch {
                    // ignore property mapping errors to avoid failing the whole mapping
                }
            }

            return obj;
        }
    }
}