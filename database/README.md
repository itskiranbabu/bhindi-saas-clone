# ⚠️ IMPORTANT: About database/queries.sql

## DO NOT EXECUTE queries.sql IN SUPABASE!

The `database/queries.sql` file is **NOT meant to be executed** in Supabase SQL Editor.

### What is queries.sql?

It's a **reference document** containing 100+ example SQL queries that show you how to:
- Query users
- Manage workspaces
- Handle conversations
- Track agent executions
- Generate analytics
- And more...

### How to use queries.sql?

1. **Open the file** to see example queries
2. **Copy individual queries** you need
3. **Modify them** for your use case
4. **Use them in your application code** (backend)

### Example:

```sql
-- From queries.sql (line 15-20)
-- Get user by email
SELECT id, email, full_name, avatar_url, status, created_at
FROM users
WHERE email = $1 AND deleted_at IS NULL;
```

**In your backend code:**
```javascript
// backend/src/routes/users.ts
const user = await db.query(
  'SELECT id, email, full_name FROM users WHERE email = $1',
  [email]
);
```

### What SHOULD you execute in Supabase?

**ONLY execute these files:**
1. ✅ `database/schema.sql` - Creates all tables, indexes, triggers
2. ❌ `database/queries.sql` - Reference only, DO NOT execute

### Why the $1, $2 parameters?

The queries use **parameterized queries** ($1, $2, $3) which are:
- ✅ Safe from SQL injection
- ✅ Used in application code
- ❌ NOT meant for direct SQL execution

### Quick Reference

| File | Purpose | Execute in Supabase? |
|------|---------|---------------------|
| `schema.sql` | Create database structure | ✅ YES |
| `queries.sql` | Query examples for code | ❌ NO (reference only) |

---

## Summary

- ✅ **Execute `schema.sql`** in Supabase SQL Editor
- ❌ **DO NOT execute `queries.sql`** - it's a reference guide
- 📖 **Use `queries.sql`** as examples for your backend code
- 🔒 **Parameterized queries** ($1, $2) are for application code, not SQL Editor

---

*If you see errors about "$1" parameters, you're trying to execute queries.sql - don't do that!*
