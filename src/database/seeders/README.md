# Database Seeders

This directory contains organized database seeders built on top of Drizzle Seed. Each seeder is designed for specific environments and use cases.

## Available Seeders

### 🔧 DevelopmentSeeder

- **Purpose**: Full development environment with realistic data
- **Data**: 100 users with weighted post distribution (700-900 total posts)
- **Use case**: Local development, testing with substantial data

### 🧪 TestSeeder

- **Purpose**: Minimal, predictable test data
- **Data**: 3 users with 2 posts each
- **Use case**: Unit tests, integration tests

### 🎯 DemoSeeder

- **Purpose**: Curated demo data for showcases
- **Data**: 5 users with tech-focused content
- **Use case**: Demonstrations, client presentations

### 🚀 ProductionSeeder

- **Purpose**: Minimal production bootstrap data
- **Data**: 1 admin user with welcome post
- **Use case**: Initial production setup

## Usage

### Quick Start

```bash
# List available seeders
bun run seed:list

# Run development seeder
bun run seed:dev

# Run test seeder
bun run seed:test

# Clear database
bun run seed:clear
```

### Detailed Commands

```bash
# Using the new seeder system
bun run seed development     # Development environment
bun run seed test           # Test environment
bun run seed demo           # Demo environment
bun run seed production     # Production environment
bun run seed --clear        # Clear database
bun run seed --list         # List all seeders
bun run seed --help         # Show help

# Using npm scripts (recommended)
bun run seed:dev           # Development
bun run seed:test          # Test
bun run seed:demo          # Demo
bun run seed:prod          # Production
bun run seed:clear         # Clear
bun run seed:list          # List
```

## Architecture

### BaseSeeder

Abstract base class providing common functionality:

- Database connection management
- Logging utilities
- Reset functionality
- Drizzle Seed integration

### SeederRegistry

Manages seeder registration and discovery:

- Automatic seeder registration
- Alias support (dev → development)
- Runtime seeder validation

### SeederManager

Orchestrates seeder execution:

- Error handling and logging
- Performance timing
- Graceful shutdown handling

## Creating Custom Seeders

1. **Extend BaseSeeder**

```typescript
import { BaseSeeder } from "./BaseSeeder";

export class CustomSeeder extends BaseSeeder {
  getName(): string {
    return "CustomSeeder";
  }

  async run(): Promise<void> {
    this.log("Starting custom seeding...");

    await this.resetDatabase();

    await this.seedWithDrizzleSeed((f) => ({
      users: {
        count: 10,
        columns: {
          name: f.fullName(),
          email: f.email(),
        },
      },
    }));

    this.logSuccess("Custom seeding completed!");
  }
}
```

2. **Register in SeederRegistry**

```typescript
// In src/database/seeders/index.ts
import { CustomSeeder } from "./CustomSeeder";

SeederRegistry.registerSeeder("custom", () => new CustomSeeder());
```

## Environment-Specific Usage

### Development

```bash
bun run seed:dev
# Creates 50 users with realistic data for local development
```

### Testing

```bash
bun run seed:test
# Creates minimal, predictable data for tests
```

### Demo/Staging

```bash
bun run seed:demo
# Creates curated demo data for presentations
```

### Production

```bash
bun run seed:prod
# ⚠️ CAREFUL! Creates minimal admin data for production bootstrap
```

## Best Practices

1. **Environment Safety**: Production seeders should be minimal and safe
2. **Data Consistency**: Use deterministic data for testing
3. **Performance**: Large datasets should use efficient seeding strategies
4. **Security**: Never commit real passwords or sensitive data
5. **Documentation**: Document the purpose and data created by each seeder

## Migration from Legacy System

The old `seed.ts` file still works for backward compatibility:

```bash
bun run seed:legacy    # Uses old seed.ts
```

However, the new seeder system is recommended for:

- Better organization
- Environment-specific data
- Easier maintenance
- Enhanced logging and error handling

## Troubleshooting

### Common Issues

1. **Seeder not found**: Check seeder name and registry
2. **Database connection**: Verify DATABASE_URL environment variable
3. **Permission errors**: Ensure database user has appropriate permissions
4. **Memory issues**: Large datasets may require chunked seeding

### Debug Mode

Enable detailed logging by setting environment variables:

```bash
DEBUG=true bun run seed:dev
```

## Dependencies

- **drizzle-seed**: Core seeding functionality
- **bcryptjs**: Password hashing
- **@paralleldrive/cuid2**: Unique ID generation

The seeder system leverages Drizzle Seed's powerful features:

- Deterministic data generation
- Weighted randomization
- Relationship handling
- Performance optimization
