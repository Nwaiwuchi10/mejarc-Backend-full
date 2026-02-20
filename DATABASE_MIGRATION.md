# Database Migration Guide - Login Verification System

## Overview

This guide provides step-by-step instructions to migrate your database to support the new login verification system.

---

## Migration Overview

### New Columns to Add to `users` Table

| Column Name                    | Type       | Nullable | Default | Purpose                          |
| ------------------------------ | ---------- | -------- | ------- | -------------------------------- |
| `loginVerificationToken`       | VARCHAR(6) | YES      | NULL    | Stores 6-digit verification code |
| `loginVerificationTokenExpiry` | TIMESTAMP  | YES      | NULL    | Token expiration timestamp       |
| `isEmailVerified`              | BOOLEAN    | NO       | false   | Tracks if email is verified      |
| `loginAttempts`                | INT        | NO       | 0       | Failed login attempt counter     |
| `lastLoginAttempt`             | TIMESTAMP  | YES      | NULL    | Last login attempt timestamp     |

---

## TypeORM Migration Steps

### Step 1: Generate Migration File

```bash
# Navigate to your project root
cd c:\Users\HP\Desktop\Fullstack\Mejarch company\Backend\my-app

# Generate migration based on current entities
npm run typeorm migration:generate -- -n AddLoginVerificationFields

# This will create a new migration file in:
# src/migrations/AddLoginVerificationFields-[timestamp].ts
```

### Step 2: Review Generated Migration

The generated migration should look something like:

```typescript
// src/migrations/[timestamp]-AddLoginVerificationFields.ts

import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLoginVerificationFields implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'loginVerificationToken',
        type: 'varchar',
        length: '6',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'loginVerificationTokenExpiry',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'isEmailVerified',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'loginAttempts',
        type: 'int',
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'lastLoginAttempt',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'lastLoginAttempt');
    await queryRunner.dropColumn('users', 'loginAttempts');
    await queryRunner.dropColumn('users', 'isEmailVerified');
    await queryRunner.dropColumn('users', 'loginVerificationTokenExpiry');
    await queryRunner.dropColumn('users', 'loginVerificationToken');
  }
}
```

### Step 3: Run Migration

```bash
# Run pending migrations
npm run typeorm migration:run

# Or if using different command
npm run migration:run

# You should see output like:
# migration AddLoginVerificationFields1707554400000 has been executed successfully.
```

### Step 4: Verify Migration

```bash
# Check if migration was applied
npm run typeorm migration:show

# You should see your migration listed as executed
```

---

## Manual SQL Migration (If Not Using TypeORM)

If you prefer to run SQL directly, execute the following:

### PostgreSQL:

```sql
ALTER TABLE users
ADD COLUMN loginVerificationToken VARCHAR(6) NULL,
ADD COLUMN loginVerificationTokenExpiry TIMESTAMP NULL,
ADD COLUMN isEmailVerified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN loginAttempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN lastLoginAttempt TIMESTAMP NULL;

-- Optional: Create index for verification token lookups
CREATE INDEX idx_loginVerificationToken ON users(loginVerificationToken);
```

### MySQL:

```sql
ALTER TABLE users
ADD COLUMN loginVerificationToken VARCHAR(6) NULL DEFAULT NULL,
ADD COLUMN loginVerificationTokenExpiry TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN isEmailVerified BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN loginAttempts INT NOT NULL DEFAULT 0,
ADD COLUMN lastLoginAttempt TIMESTAMP NULL DEFAULT NULL;

-- Optional: Create index for verification token lookups
CREATE INDEX idx_loginVerificationToken ON users(loginVerificationToken);
```

### SQLite:

```sql
-- SQLite doesn't support ALTER TABLE ADD COLUMN with constraints well
-- Use this approach instead:

BEGIN TRANSACTION;

-- Create new table with all columns
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phoneNumber TEXT,
  password TEXT,
  profilePics TEXT,
  userType TEXT DEFAULT 'Customer',
  name TEXT,
  isSuspended BOOLEAN DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP,
  loginVerificationToken VARCHAR(6),
  loginVerificationTokenExpiry TIMESTAMP,
  isEmailVerified BOOLEAN DEFAULT 0,
  loginAttempts INTEGER DEFAULT 0,
  lastLoginAttempt TIMESTAMP
);

-- Copy data from old table
INSERT INTO users_new
SELECT
  id, firstName, lastName, email, phoneNumber, password,
  profilePics, userType, name, isSuspended,
  createdAt, updatedAt, deletedAt,
  NULL, NULL, 0, 0, NULL
FROM users;

-- Drop old table
DROP TABLE users;

-- Rename new table
ALTER TABLE users_new RENAME TO users;

COMMIT;
```

---

## Rollback Instructions

If you need to rollback the migration:

### Using TypeORM:

```bash
# List all migrations
npm run typeorm migration:show

# Revert the last migration
npm run typeorm migration:revert

# Revert multiple times if needed
npm run typeorm migration:revert
npm run typeorm migration:revert
```

### Using Raw SQL (Rollback):

```sql
-- PostgreSQL/MySQL
ALTER TABLE users
DROP COLUMN loginVerificationToken,
DROP COLUMN loginVerificationTokenExpiry,
DROP COLUMN isEmailVerified,
DROP COLUMN loginAttempts,
DROP COLUMN lastLoginAttempt;
```

---

## Pre-Migration Checklist

- [ ] Backup your database
- [ ] Stop your application
- [ ] Test migration on staging environment first
- [ ] Verify all files are updated (entity, service, controller, DTOs)
- [ ] Ensure `.env` file has correct database credentials
- [ ] Check TypeORM configuration in `ormconfig.json` or `app.module.ts`

---

## Post-Migration Testing

### 1. Verify Table Structure

```bash
# Connect to your database and check the users table

# PostgreSQL
\d users

# MySQL
DESCRIBE users;

# SQLite
.schema users
```

### 2. Test Login Flow

```bash
# 1. Create a test user
curl -X POST http://localhost:3000/user/creates \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "password123"
  }'

# 2. Login
curl -X POST http://localhost:3000/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 3. Verify token (use token from email)
curl -X POST http://localhost:3000/user/verify-login-token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "verificationToken": "A1B2C3"
  }'
```

### 3. Check Database Records

```sql
-- View user record with new columns
SELECT
  id, email, isEmailVerified, loginAttempts,
  loginVerificationToken, loginVerificationTokenExpiry
FROM users
WHERE email = 'test@example.com';
```

---

## Common Issues & Solutions

### Issue: Migration not found

**Solution:**

```bash
# Make sure you're in the correct directory
cd c:\Users\HP\Desktop\Fullstack\Mejarch company\Backend\my-app

# Check if migration file was created
ls src/migrations/
```

### Issue: "Entity metadata not found"

**Solution:**

- Ensure TypeORM is properly configured
- Check that entities are registered in `app.module.ts`
- Verify database connection credentials

### Issue: Permission denied on migration

**Solution:**

- Ensure database user has ALTER TABLE permissions
- Run as admin/super user if needed

### Issue: Column already exists

**Solution:**

```bash
# If column already exists, revert and start fresh
npm run typeorm migration:revert

# Then re-run
npm run typeorm migration:run
```

---

## TypeORM Configuration

Ensure your TypeORM configuration includes migrations folder:

### In `app.module.ts` (TypeOrmModule):

```typescript
TypeOrmModule.forRoot({
  // ... other config
  migrations: ['src/migrations/*.ts'],
  cli: {
    migrationsDir: 'src/migrations',
  },
});
```

### In `ormconfig.json`:

```json
{
  "type": "postgres",
  "host": "localhost",
  "port": 5432,
  "username": "postgres",
  "password": "password",
  "database": "mydatabase",
  "entities": ["src/**/*.entity.ts"],
  "migrations": ["src/migrations/*.ts"],
  "cli": {
    "migrationsDir": "src/migrations"
  }
}
```

---

## NPM Scripts for Migrations

Add these scripts to your `package.json` for easier migration management:

```json
{
  "scripts": {
    "migration:generate": "typeorm migration:generate",
    "migration:run": "typeorm migration:run",
    "migration:revert": "typeorm migration:revert",
    "migration:show": "typeorm migration:show",
    "db:sync": "typeorm schema:sync"
  }
}
```

Then use:

```bash
npm run migration:generate -- -n AddLoginVerificationFields
npm run migration:run
npm run migration:show
```

---

## After Migration Complete

### 1. Test All Endpoints

- Register a new user
- Login with email/password
- Verify token via email
- Login again with same credentials
- Test error cases (wrong password, expired token)

### 2. Frontend Integration

Update your frontend to use the new login flow:

- Implement login form
- Handle verification code input
- Store JWT token
- Redirect to authenticated pages

### 3. Security Audit

- [ ] Verify passwords are hashed (check in database)
- [ ] Verify tokens are cleared after use
- [ ] Verify account locks after 5 failed attempts
- [ ] Test email delivery
- [ ] Verify no sensitive data in logs

### 4. Monitoring Setup

- Monitor login failures
- Monitor email delivery
- Monitor account lockouts
- Log all authentication events

---

## Deployment Checklist

For production deployment:

- [ ] Migration tested on staging environment
- [ ] Database backed up
- [ ] JWT configuration updated (replace placeholder)
- [ ] Email service credentials verified
- [ ] Frontend integration completed
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Rate limiting implemented
- [ ] Error logging configured
- [ ] Monitoring alerts set up
- [ ] Documentation updated
- [ ] Team trained on new flow

---

## Comparison: Before vs After

### Before Migration

```sql
users table columns:
- id, firstName, lastName, email, phoneNumber
- password, profilePics, userType, name
- isSuspended, createdAt, updatedAt, deletedAt
```

### After Migration

```sql
users table columns:
- id, firstName, lastName, email, phoneNumber
- password, profilePics, userType, name
- isSuspended, createdAt, updatedAt, deletedAt
- ** loginVerificationToken
- ** loginVerificationTokenExpiry
- ** isEmailVerified
- ** loginAttempts
- ** lastLoginAttempt
```

---

## Performance Notes

- New columns have minimal storage overhead:
  - `loginVerificationToken`: 6 bytes (VARCHAR(6))
  - `loginVerificationTokenExpiry`: 8 bytes (TIMESTAMP)
  - `isEmailVerified`: 1 byte (BOOLEAN)
  - `loginAttempts`: 4 bytes (INT)
  - `lastLoginAttempt`: 8 bytes (TIMESTAMP)
- **Total per user**: ~27 bytes additional storage

- Index on `loginVerificationToken` recommended for faster lookups

---

## Support & Troubleshooting

For additional help:

1. Check TypeORM documentation: https://typeorm.io/#migrations
2. Verify database connection
3. Check migration logs
4. The LOGIN_FLOW_DOCUMENTATION.md file for system overview
5. The LOGIN_API_REFERENCE.md file for API details

---

**Created:** February 10, 2026
**Last Updated:** February 10, 2026
