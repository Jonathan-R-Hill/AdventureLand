using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;
using System.Data;

namespace AdventureApi.Extract
{
    public static class GameInfo
    {
        private static readonly string ConnectionString = Environment.GetEnvironmentVariable( "MYSQL_CONNECTION_STRING" );

        public static string? GetCharInfo ( Dtos.CharacterInfo character )
        {
            if ( character == null ) return null;

            if ( character.Name == null ) return null;

            try {
                using var connection = new MySqlConnection( ConnectionString );
                connection.Open( );

                using var command = connection.CreateCommand( );
                command.CommandType = CommandType.StoredProcedure;
                command.CommandText = "Characters_Merge";

                var props = character.GetType( ).GetProperties( BindingFlags.Public | BindingFlags.Instance );
                foreach ( var prop in props ) {
                    var param = command.CreateParameter( );
                    param.ParameterName = "@p" + prop.Name;

                    var value = prop.GetValue( character );
                    param.Value = value ?? DBNull.Value;

                    command.Parameters.Add( param );
                }

                command.ExecuteNonQuery( );
            }
            catch ( Exception ex ) {
                Console.WriteLine( ex.ToString( ) );
                return null;
            }

            return "Character info processed successfully.";
        }
    }
}
