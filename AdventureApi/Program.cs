using Microsoft.AspNetCore.Routing.Constraints;
using MySql.Data.MySqlClient;

namespace AdventureApi
{
    public class Program
    {
        public static void Main ( string[] args )
        {
            var builder = WebApplication.CreateSlimBuilder( args );

            builder.WebHost.UseKestrelHttpsConfiguration( );

            builder.Services.Configure<RouteOptions>( options => {
                options.SetParameterPolicy<RegexInlineRouteConstraint>( "regex" );
            } );

            builder.Services.AddTransient<MySqlConnection>( _ =>
                new MySqlConnection( builder.Configuration.GetConnectionString( "Default" ) ) );

            builder.Services.AddScoped<MySqlConnection>( _ => {
                var cs = builder.Configuration.GetConnectionString( "MYSQL_CONNECTION_STRING" );
                return new MySqlConnection( cs );
            } );

            builder.Services.ConfigureHttpJsonOptions( options => {
                options.SerializerOptions.TypeInfoResolverChain.Insert( 0, AppJsonSerializerContext.Default );
            } );

            builder.Services.AddEndpointsApiExplorer( );
            builder.Services.AddSwaggerGen( );

            var app = builder.Build( );

            if ( app.Environment.IsDevelopment( ) ) {
                app.UseSwagger( );
                app.UseSwaggerUI( );
            }

            app.MapRoutes( );

            app.Run( );
        }
    }
}
