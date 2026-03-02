var builder = DistributedApplication.CreateBuilder(args);

// LLM API Key
var llmApiKey = builder.AddParameter("llm-api-key", secret: true);

// Azure OpenAI configuration
var azureOpenAiEndpoint = builder.AddParameter("azure-openai-endpoint", secret: false);
var azureOpenAiApiKey = builder.AddParameter("azure-openai-api-key", secret: true);
var azureOpenAiDeployment = builder.AddParameter("azure-openai-deployment", secret: false);

// Auth0 configuration
var auth0Domain = builder.AddParameter("auth0-domain", secret: false);
var auth0ClientId = builder.AddParameter("auth0-client-id", secret: false);
var auth0ClientSecret = builder.AddParameter(
    "auth0-client-secret", secret: true
);
var auth0SessionSecret = builder.AddParameter(
    "auth0-session-secret", secret: true
);
var auth0Audience = builder.AddParameter("auth0-audience", secret: false);

// Azure Storage (Azurite emulator for local dev)
var storage = builder.AddAzureStorage("storage")
    .RunAsEmulator(azurite =>
    {
        azurite.WithLifetime(ContainerLifetime.Persistent);
        azurite.WithDataVolume();
    });
var queues = storage.AddQueues("queues");

// SQL Server 2025
var sql = builder.AddSqlServer("sql")
    .WithImageTag("2025-latest")
    .AddDatabase("mealplanner");

// FastAPI API
var api = builder.AddPythonModule("api", "../../api", "uvicorn")
    .WithArgs(
        "src.api.main:app",
        "--host", "0.0.0.0", "--port", "8000", "--reload"
    )
    .WithHttpEndpoint(
        port: 8000, targetPort: 8000,
        name: "http", isProxied: false
    )
    .WithExternalHttpEndpoints()
    .WithReference(queues)
    .WithReference(sql)
    .WithEnvironment("LLM_API_KEY", llmApiKey)
    .WithEnvironment("AUTH0_DOMAIN", auth0Domain)
    .WithEnvironment("AUTH0_CLIENT_ID", auth0ClientId)
    .WithEnvironment("AUTH0_CLIENT_SECRET", auth0ClientSecret)
    .WithEnvironment("AUTH0_SESSION_SECRET", auth0SessionSecret)
    .WithEnvironment("AUTH0_AUDIENCE", auth0Audience)
    .WithEnvironment("API_BASE_URL", "http://localhost:8000");

// Next.js Frontend
var web = builder.AddNpmApp("web", "../../../apps/web", "dev")
    .WithHttpEndpoint(
        port: 3000, targetPort: 3000,
        name: "http", isProxied: false
    )
    .WithExternalHttpEndpoints()
    .WithEnvironment(
        "NEXT_PUBLIC_API_URL", "http://localhost:8000"
    );

// Meal Plan Generator Worker
var workersRoot = Path.GetFullPath(
    Path.Combine(builder.AppHostDirectory, "../../workers")
);
var worker = builder.AddExecutable(
        "meal-plan-worker",
        Path.Combine(workersRoot, ".venv/Scripts/python.exe"),
        workersRoot,
        "-m", "meal_plan_generator"
    )
    .WithReference(queues)
    .WithReference(sql)
    .WithEnvironment("LLM_API_KEY", llmApiKey)
    .WithEnvironment("AZURE_OPENAI_ENDPOINT", azureOpenAiEndpoint)
    .WithEnvironment("AZURE_OPENAI_API_KEY", azureOpenAiApiKey)
    .WithEnvironment("AZURE_OPENAI_DEPLOYMENT", azureOpenAiDeployment)
    .WithEnvironment("HEALTH_PORT", "8091")
    .WithEnvironment("QUEUE_POLL_INTERVAL", "5.0")
    .WithHttpEndpoint(
        port: 8091, targetPort: 8091,
        name: "health", isProxied: false
    )
    .WithOtlpExporter();

builder.Build().Run();
