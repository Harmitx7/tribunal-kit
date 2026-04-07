---
name: csharp-developer
description: Senior C#/.NET developer with mastery of .NET 9+, C# 13, ASP.NET Core Minimal APIs, Entity Framework Core, Blazor, gRPC, AOT compilation, Span<T>/Memory<T> performance, dependency injection, and clean architecture. Covers modern language features, async patterns, testing with xUnit, and production deployment. Use when building .NET applications, APIs, or any C# code.
allowed-tools: Read, Write, Edit, Glob, Grep
version: 2.0.0
last-updated: 2026-04-01
applies-to-model: gemini-2.5-pro, claude-3-7-sonnet
---

# C# / .NET Pro — .NET 9+ & C# 13 Mastery

---

## Modern C# Language Features

### Records & Primary Constructors

```csharp
// Records — immutable data types with value equality
public record UserDto(string Name, string Email, string Role = "user");

// With custom validation
public record CreateUserRequest(string Name, string Email)
{
    public string Name { get; init; } = !string.IsNullOrWhiteSpace(Name)
        ? Name.Trim()
        : throw new ArgumentException("Name is required", nameof(Name));
}

// Primary constructors (C# 12+) — classes too
public class UserService(IUserRepository repo, ILogger<UserService> logger)
{
    public async Task<User?> GetUserAsync(int id, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching user {UserId}", id);
        return await repo.GetByIdAsync(id, ct);
    }
}

// ❌ HALLUCINATION TRAP: Primary constructor parameters are NOT fields
// They're captured by closure — don't use them where a field is needed
// For mutable backing, assign to a private field explicitly
```

### Pattern Matching (C# 12+)

```csharp
// Switch expressions with pattern matching
public static string ClassifyTemperature(double temp) => temp switch
{
    < 0 => "Freezing",
    >= 0 and < 15 => "Cold",
    >= 15 and < 25 => "Comfortable",
    >= 25 and < 35 => "Warm",
    >= 35 => "Hot",
};

// Property patterns
public static decimal CalculateDiscount(Order order) => order switch
{
    { Total: > 1000, Customer.IsPremium: true } => 0.20m,
    { Total: > 500 } => 0.10m,
    { Customer.IsPremium: true } => 0.05m,
    _ => 0m,
};

// List patterns (C# 11+)
public static string DescribeArray(int[] arr) => arr switch
{
    [] => "Empty",
    [var single] => $"Single: {single}",
    [var first, .., var last] => $"First: {first}, Last: {last}",
};
```

### Collection Expressions & Ranges

```csharp
// Collection expressions (C# 12+)
List<int> numbers = [1, 2, 3, 4, 5];
int[] array = [10, 20, 30];
Span<byte> bytes = [0xFF, 0x00, 0xAB];

// Spread operator
int[] combined = [..numbers, ..array, 99];

// Ranges and indices
var last = array[^1];           // last element
var slice = array[1..^1];       // skip first and last
var firstThree = array[..3];    // first 3 elements
```

### Nullable Reference Types

```csharp
// Enable globally in .csproj
// <Nullable>enable</Nullable>

public class UserService
{
    // Non-nullable — compiler enforces this is never null
    public string GetDisplayName(User user)
    {
        return user.DisplayName ?? user.Email; // DisplayName might be null
    }

    // Nullable return — caller MUST handle null
    public async Task<User?> FindUserAsync(string email, CancellationToken ct)
    {
        return await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
    }

    // ❌ HALLUCINATION TRAP: Never use the null-forgiving operator (!) to suppress warnings
    // ❌ var user = await FindUserAsync(email, ct)!;  ← hides nulls, crashes at runtime
    // ✅ var user = await FindUserAsync(email, ct) ?? throw new NotFoundException("User");
}
```

---

## ASP.NET Core Minimal APIs

### Route Structure

```csharp
var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

// Route groups
var api = app.MapGroup("/api").RequireAuthorization();

var users = api.MapGroup("/users").WithTags("Users");
users.MapGet("/", GetUsersAsync);
users.MapGet("/{id:int}", GetUserByIdAsync);
users.MapPost("/", CreateUserAsync).AllowAnonymous();
users.MapPut("/{id:int}", UpdateUserAsync);
users.MapDelete("/{id:int}", DeleteUserAsync);

app.Run();
```

### Handler Methods

```csharp
static async Task<Results<Ok<UserDto>, NotFound>> GetUserByIdAsync(
    int id,
    IUserService userService,
    CancellationToken ct)
{
    var user = await userService.GetByIdAsync(id, ct);
    return user is not null
        ? TypedResults.Ok(user.ToDto())
        : TypedResults.NotFound();
}

static async Task<Results<Created<UserDto>, ValidationProblem>> CreateUserAsync(
    CreateUserRequest request,
    IUserService userService,
    IValidator<CreateUserRequest> validator,
    CancellationToken ct)
{
    var validation = await validator.ValidateAsync(request, ct);
    if (!validation.IsValid)
        return TypedResults.ValidationProblem(validation.ToDictionary());

    var user = await userService.CreateAsync(request, ct);
    return TypedResults.Created($"/api/users/{user.Id}", user.ToDto());
}

// ❌ HALLUCINATION TRAP: Always accept CancellationToken in async handlers
// ASP.NET Core provides it automatically via DI
// Without it, requests can't be cancelled on client disconnect
```

### Endpoint Filters (Middleware for Endpoints)

```csharp
// Validation filter
public class ValidationFilter<T> : IEndpointFilter where T : class
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext ctx,
        EndpointFilterDelegate next)
    {
        var validator = ctx.HttpContext.RequestServices.GetService<IValidator<T>>();
        var argument = ctx.Arguments.OfType<T>().FirstOrDefault();

        if (validator is not null && argument is not null)
        {
            var result = await validator.ValidateAsync(argument);
            if (!result.IsValid)
                return TypedResults.ValidationProblem(result.ToDictionary());
        }

        return await next(ctx);
    }
}

// Usage:
users.MapPost("/", CreateUserAsync)
    .AddEndpointFilter<ValidationFilter<CreateUserRequest>>();
```

---

## Entity Framework Core

### DbContext & Configuration

```csharp
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Post> Posts => Set<Post>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    // Auto-set timestamps
    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
                entry.Entity.CreatedAt = DateTime.UtcNow;
            if (entry.State is EntityState.Added or EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }
        return await base.SaveChangesAsync(ct);
    }
}

// Entity configuration (separate file per entity)
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasIndex(u => u.Email).IsUnique();
        builder.Property(u => u.Name).HasMaxLength(100).IsRequired();
        builder.Property(u => u.Email).HasMaxLength(255).IsRequired();
        builder.HasMany(u => u.Posts).WithOne(p => p.Author).HasForeignKey(p => p.AuthorId);
    }
}
```

### Query Patterns

```csharp
// ✅ Efficient queries — project to DTOs at the database level
public async Task<List<UserDto>> GetActiveUsersAsync(CancellationToken ct)
{
    return await _db.Users
        .AsNoTracking()  // read-only — no change tracking overhead
        .Where(u => u.IsActive)
        .OrderByDescending(u => u.CreatedAt)
        .Select(u => new UserDto(u.Name, u.Email, u.Role))  // projects SQL SELECT
        .ToListAsync(ct);
}

// ❌ HALLUCINATION TRAP: Loading entities then mapping is N+1 and memory waste
// ❌ var users = await _db.Users.ToListAsync(ct);  ← loads ALL columns, ALL rows
//    return users.Select(u => new UserDto(u.Name, u.Email));  ← maps in memory
// ✅ Use .Select() BEFORE .ToListAsync() to project at DB level

// Pagination
public async Task<PagedResult<UserDto>> GetUsersPagedAsync(int page, int pageSize, CancellationToken ct)
{
    var query = _db.Users.AsNoTracking().Where(u => u.IsActive);

    var totalCount = await query.CountAsync(ct);
    var items = await query
        .OrderBy(u => u.Id)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(u => new UserDto(u.Name, u.Email, u.Role))
        .ToListAsync(ct);

    return new PagedResult<UserDto>(items, totalCount, page, pageSize);
}

// Compiled queries (for hot paths)
private static readonly Func<AppDbContext, string, CancellationToken, Task<User?>> _getUserByEmail =
    EF.CompileAsyncQuery((AppDbContext db, string email, CancellationToken ct) =>
        db.Users.FirstOrDefault(u => u.Email == email));
```

---

## Async Patterns

```csharp
// ✅ Correct async patterns
public async Task<Result<User>> ProcessUserAsync(int id, CancellationToken ct)
{
    // Parallel async operations
    var (user, permissions) = await (
        _userRepo.GetByIdAsync(id, ct),
        _permissionService.GetPermissionsAsync(id, ct)
    );

    // Async streams (IAsyncEnumerable)
    await foreach (var notification in GetNotificationsAsync(id, ct))
    {
        await SendNotificationAsync(notification, ct);
    }

    return Result.Ok(user);
}

// Channels (producer-consumer)
var channel = Channel.CreateBounded<WorkItem>(100);

// Producer
async Task ProduceAsync(ChannelWriter<WorkItem> writer, CancellationToken ct)
{
    await foreach (var item in GetWorkItemsAsync(ct))
    {
        await writer.WriteAsync(item, ct);
    }
    writer.Complete();
}

// Consumer
async Task ConsumeAsync(ChannelReader<WorkItem> reader, CancellationToken ct)
{
    await foreach (var item in reader.ReadAllAsync(ct))
    {
        await ProcessAsync(item, ct);
    }
}

// ❌ HALLUCINATION TRAP: Never use .Result or .Wait() on async methods
// ❌ var user = GetUserAsync(id).Result;  ← deadlock risk
// ❌ GetUserAsync(id).Wait();            ← deadlock risk
// ✅ var user = await GetUserAsync(id, ct);
```

---

## Performance Patterns

```csharp
// Span<T> — zero-allocation slicing
public static ReadOnlySpan<char> ExtractDomain(ReadOnlySpan<char> email)
{
    var atIndex = email.IndexOf('@');
    return atIndex >= 0 ? email[(atIndex + 1)..] : ReadOnlySpan<char>.Empty;
}

// ArrayPool — rent instead of allocate
public static void ProcessLargeData()
{
    var buffer = ArrayPool<byte>.Shared.Rent(8192);
    try
    {
        // Use buffer...
    }
    finally
    {
        ArrayPool<byte>.Shared.Return(buffer);
    }
}

// Frozen collections (immutable, optimized lookup)
FrozenDictionary<string, int> lookup = new Dictionary<string, int>
{
    ["admin"] = 1,
    ["user"] = 2,
    ["moderator"] = 3,
}.ToFrozenDictionary();
```

---

## Testing with xUnit

```csharp
public class UserServiceTests
{
    private readonly Mock<IUserRepository> _repoMock = new();
    private readonly Mock<ILogger<UserService>> _loggerMock = new();
    private readonly UserService _sut;

    public UserServiceTests()
    {
        _sut = new UserService(_repoMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task GetUserAsync_ReturnsUser_WhenFound()
    {
        // Arrange
        var expected = new User { Id = 1, Name = "Alice", Email = "alice@test.com" };
        _repoMock.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        // Act
        var result = await _sut.GetUserAsync(1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Alice", result.Name);
    }

    [Fact]
    public async Task GetUserAsync_ReturnsNull_WhenNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var result = await _sut.GetUserAsync(999);

        Assert.Null(result);
    }

    [Theory]
    [InlineData("", "required")]
    [InlineData("ab", "too short")]
    public async Task CreateUser_Fails_WithInvalidName(string name, string expectedError)
    {
        var request = new CreateUserRequest(name, "test@test.com");

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _sut.CreateAsync(request));

        Assert.Contains(expectedError, ex.Message, StringComparison.OrdinalIgnoreCase);
    }
}

// Integration test with WebApplicationFactory
public class UsersApiTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task GetUsers_Returns200()
    {
        var response = await _client.GetAsync("/api/users");
        response.EnsureSuccessStatusCode();

        var users = await response.Content.ReadFromJsonAsync<List<UserDto>>();
        Assert.NotNull(users);
    }
}
```

---
