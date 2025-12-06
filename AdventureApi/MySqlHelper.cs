using MySql.Data.MySqlClient;

namespace AdventureApi
{
    public static class MySqlHelper
    {
        private const string DefaultConnectionName = "DefaultConnection";

        private static string GetConnectionString(IConfiguration configuration, string name)
        {
            if (configuration is null)
            {
                throw new ArgumentNullException(nameof(configuration));
            }

            var connectionString = configuration.GetConnectionString(name);
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException($"Connection string '{name}' was not found in configuration.");
            }

            return connectionString;
        }

        public static MySqlConnection CreateConnection(IConfiguration configuration, string name = DefaultConnectionName)
        {
            var cs = GetConnectionString(configuration, name);
            return new MySqlConnection(cs);
        }

        /// <summary>
        /// Creates and opens a MySqlConnection using the connection string from configuration.
        /// Caller is responsible for disposing the returned connection.
        /// </summary>
        public static MySqlConnection CreateOpenConnection(IConfiguration configuration, string name = DefaultConnectionName)
        {
            var connection = CreateConnection(configuration, name);
            connection.Open();
            return connection;
        }

        /// <summary>
        /// Registers MySqlConnection in the DI container as transient using the connection string from configuration.
        /// </summary>
        public static IServiceCollection AddMySql(this IServiceCollection services, IConfiguration configuration, string name = DefaultConnectionName)
        {
            if (services is null)
            {
                throw new ArgumentNullException(nameof(services));
            }

            var cs = GetConnectionString(configuration, name);
            services.AddTransient(_ => new MySqlConnection(cs));
            return services;
        }
    }
}
