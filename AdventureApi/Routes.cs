using AdventureApi.Extract;
using AdventureApi.Fetch;
using Microsoft.AspNetCore.Mvc;

namespace AdventureApi;

public static class Routes
{
    public static void MapRoutes ( this IEndpointRouteBuilder app )
    {
        app.MapExtractRoutes( );
        app.MapFetchRoutes( );
    }

    private static void MapExtractRoutes ( this IEndpointRouteBuilder app )
    {
        var extractInfo = app.MapGroup( "/extract" );

        extractInfo.MapPost( "/charInfo", ( [FromBody] Dtos.CharacterInfo character ) => {
            string? result = GameInfo.GetCharInfo( character );

            if ( result == null ) return Results.BadRequest( "Invalid character info" );

            return Results.Ok( "Character Updated" );
        } );
    }

    private static void MapFetchRoutes ( this IEndpointRouteBuilder app )
    {
        var fetchInfo = app.MapGroup( "/fetch" );

        fetchInfo.MapGet( "/charInfo", ( ) => {
            string? result = DataBaseInfo.GetCharInfo( );

            if ( result == null ) {
                return Results.BadRequest( "No Info found" );
            }

            return Results.Ok( result );
        } );
    }
}
