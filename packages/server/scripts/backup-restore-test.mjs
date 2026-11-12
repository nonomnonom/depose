import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE = 'postgresql://depose:changeme@localhost:5432/depose';
const TARGET = 'postgresql://depose:changeme@localhost:5432/depose_backup_restore_test';
const DRIZZLE_MIGRATIONS_DIR = resolve(process.cwd(), 'drizzle');

function escapeSqlString(v) {
  return "'" + v.replace(/'/g, "''") + "'";
}

function valueToSql(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'string') return escapeSqlString(v);
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return "'" + v.toISOString() + "'";
  return "'" + String(v) + "'";
}

async function applyMigrations(tgtClient) {
  // Read and apply each migration SQL file
  const migrationFiles = [
    '0000_material_zarda.sql',
    '0001_happy_warpath.sql',
    '0002_preferences_and_settings_fixes.sql',
    '0003_webhooks_and_api_key_hardening.sql',
    '0004_workflow_subsets_and_archive.sql',
  ];    for (const file of migrationFiles) {
      const filePath = resolve(DRIZZLE_MIGRATIONS_DIR, file);
      try {
        const sql = readFileSync(filePath, 'utf-8');
        // Split by semicolons (naive, but works for these migrations)
        const statements = sql.split(';').filter((s) => s.trim().length > 0);
        for (const stmt of statements) {
          const trimmed = stmt.trim();
          if (trimmed) {
            try {
              await tgtClient.query(trimmed);
            } catch (e) {
              // Ignore "does not exist" errors for DROP statements (idempotency)
              if (e.message.includes('does not exist') || e.message.includes('already exists')) {
                // skip
              } else {
                throw e;
              }
            }
          }
        }
        console.log(`  Applied ${file}`);
      } catch (e) {
        console.log(`  ${file}: ERROR - ${e.message}`);
      }
    }
}

async function main() {
  console.log('Starting backup/restore...');

  // Source DB
  const srcPool = new Pool({ connectionString: SOURCE });
  const srcClient = await srcPool.connect();

  // Target DB
  const tgtPool = new Pool({ connectionString: TARGET });
  const tgtClient = await tgtPool.connect();

  try {
    // Apply schema migrations to target
    console.log('\nApplying schema migrations to target...');
    await applyMigrations(tgtClient);

    // Get list of tables with their FK dependencies
    const { rows: tables } = await srcClient.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
    );
    console.log('\nTables to migrate:', tables.length);

    // Get FK dependencies for each table
    const tableFks = {};
    for (const t of tables) {
      const tableName = t.table_name;
      const { rows: fks } = await srcClient.query(
        `SELECT ccu.table_name as ref_table
         FROM information_schema.table_constraints tc
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name
         WHERE tc.table_schema = 'public'
           AND tc.table_name = $1
           AND tc.constraint_type = 'FOREIGN KEY'
         GROUP BY ccu.table_name`,
        [tableName]
      );
      tableFks[tableName] = fks.map((f) => f.ref_table).filter(Boolean);
    }

    // Topological sort: tables with no FK deps first
    const sortedTables = [];
    const visited = new Set();
    const temp = new Set();

    function visit(tableName) {
      if (visited.has(tableName)) return;
      if (temp.has(tableName)) return; // cycle
      temp.add(tableName);
      for (const dep of (tableFks[tableName] || [])) {
        if (tables.some((t) => t.table_name === dep)) {
          visit(dep);
        }
      }
      temp.delete(tableName);
      visited.add(tableName);
      sortedTables.push(tableName);
    }

    for (const t of tables) {
      visit(t.table_name);
    }

    console.log('Insert order:', sortedTables.join(' -> '));

    let totalRows = 0;

    for (const tableName of sortedTables) {
      try {
        // Get columns
        const { rows: cols } = await srcClient.query(
          "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
          [tableName]
        );
        const columnNames = cols.map((c) => c.column_name);

        // Get column types to handle JSON/array
        const { rows: colTypes } = await srcClient.query(
          "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
          [tableName]
        );
        const typeMap = {};
        for (const ct of colTypes) {
          typeMap[ct.column_name] = ct.data_type;
        }

        // Dump data
        const { rows: data } = await srcClient.query(
          'SELECT ' + columnNames.map((c) => '"' + c + '"').join(',') + ' FROM "' + tableName + '"'
        );

        if (data.length === 0) {
          console.log(`  ${tableName}: 0 rows`);
          continue;
        }

        // Start a new transaction for this table
        await tgtClient.query('BEGIN');

        try {
          // Truncate target table (ignore if doesn't exist)
          try {
            await tgtClient.query('TRUNCATE "' + tableName + '" CASCADE');
          } catch (e) {
            if (e.message.includes('does not exist')) {
              console.log(`  ${tableName}: target table does not exist, skipping`);
              await tgtClient.query('ROLLBACK');
              continue;
            }
            throw e;
          }

          // Insert data using parameterized queries
          const columns = columnNames.map((c) => '"' + c + '"');
          const values = columnNames.map((c) => '$' + (columnNames.indexOf(c) + 1));
          const insertSql =
            'INSERT INTO "' +
            tableName +
            '" (' +
            columns.join(',') +
            ') VALUES (' +
            values.join(',') +
            ')';

          for (const row of data) {
            const params = columnNames.map((c) => {
              const v = row[c];
              const type = typeMap[c];
              if (v === null || v === undefined) return null;
              // Handle JSON/JSONB: ensure it's a valid JSON string
              if (type === 'json' || type === 'jsonb') {
                if (typeof v === 'object') {
                  return JSON.stringify(v);
                }
                if (typeof v === 'string') {
                  try {
                    // If it's already a JSON string, return as-is
                    JSON.parse(v);
                    return v;
                  } catch {
                    // If it's not valid JSON, wrap it
                    return JSON.stringify(v);
                  }
                }
                return JSON.stringify(v);
              }
              // Handle DATE/timestamptz: convert to Date object
              if (type === 'date' || type === 'timestamptz') {
                if (typeof v === 'string') {
                  return new Date(v);
                }
                return v;
              }
              return v;
            });
            await tgtClient.query(insertSql, params);
          }

          await tgtClient.query('COMMIT');
          totalRows += data.length;
          console.log(`  ${tableName}: ${data.length} rows`);
        } catch (e) {
          await tgtClient.query('ROLLBACK');
          console.log(`  ${tableName}: ERROR - ${e.message}`);
        }
      } catch (e) {
        console.log(`  ${tableName}: ERROR - ${e.message}`);
      }
    }

    console.log(`\nRestore complete! Total rows: ${totalRows}`);

    // Verify: compare row counts
    console.log('\nVerification:');
    let allMatch = true;
    for (const t of tables) {
      const tableName = t.table_name;
      try {
        const srcCount = await srcClient.query('SELECT COUNT(*) FROM "' + tableName + '"');
        let tgtCount;
        try {
          tgtCount = await tgtClient.query('SELECT COUNT(*) FROM "' + tableName + '"');
        } catch (e) {
          if (e.message.includes('does not exist')) {
            tgtCount = { rows: [{ count: '0' }] };
          } else {
            throw e;
          }
        }
        const srcN = parseInt(srcCount.rows[0].count, 10);
        const tgtN = parseInt(tgtCount.rows[0].count, 10);
        const match = srcN === tgtN ? 'OK' : 'MISMATCH';
        if (srcN !== tgtN) allMatch = false;
        console.log(`  ${tableName}: source=${srcN}, target=${tgtN} [${match}]`);
      } catch (e) {
        console.log(`  ${tableName}: ERROR - ${e.message}`);
      }
    }

    console.log(allMatch ? '\n✓ All tables match!' : '\n✗ Some tables mismatch!');
  } catch (e) {
    await tgtClient.query('ROLLBACK');
    console.error('\nFailed:', e.message);
    process.exit(1);
  } finally {
    srcClient.release();
    tgtClient.release();
    await srcPool.end();
    await tgtPool.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
