const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '.env');
require('dotenv').config({ path: envPath });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret'; // Set a test JWT secret

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function dropAllTables(pool) {
  console.log('Attempting to drop all tables...');
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$ DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
              EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
      END $$;
    `);
    console.log('All tables dropped successfully.');
  } catch (error) {
    console.error('Error dropping tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function applyMigrations(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migration_history (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Migration history table created.');

  const ddlPath = path.join(__dirname, '../../proyecto-db/ddl');
  const migrationFiles = (await fs.readdir(ddlPath))
    .filter(file => file.endsWith('.sql') && file !== 'postgres_schema_consolidado.sql').sort();

  for (const file of migrationFiles) {
    const migrationName = file;
    const { rows } = await pool.query('SELECT 1 FROM migration_history WHERE migration_name = $1', [migrationName]);
    const migrationExists = rows.length > 0;

    if (!migrationExists) {
      console.log(`Attempting to apply migration: ${migrationName}`);
      const filePath = path.join(ddlPath, file);
      const sql = await fs.readFile(filePath, 'utf8');
      await pool.query(sql);
      await pool.query('INSERT INTO migration_history (migration_name) VALUES ($1)', [migrationName]);
      console.log(`Applied migration: ${migrationName}`);
    }
  }
}

async function applyDMLScripts(pool) {
  const dmlPath = path.join(__dirname, '../../proyecto-db/dml');
  const dmlFiles = (await fs.readdir(dmlPath)).filter(file => file.endsWith('.sql')).sort();

  for (const file of dmlFiles) {
    const filePath = path.join(dmlPath, file);
    const sql = await fs.readFile(filePath, 'utf8');
    console.log(`Executing DML script: ${file}`);
    await pool.query(sql);
    console.log(`Applied DML script: ${file}`);
  }
}

async function resetSequences(pool) {
    console.log('Resetting all database sequences...');
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT c.relname AS sequence_name
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relkind = 'S' AND n.nspname = 'public';
        `);

        for (const row of res.rows) {
            const seqName = row.sequence_name;
            
            // Find the table and column this sequence is attached to
            const colRes = await client.query(`
                SELECT a.attrelid::regclass::text AS table_name, a.attname AS column_name
                FROM pg_attribute a
                JOIN pg_class s ON s.oid = pg_get_serial_sequence(a.attrelid::regclass::text, a.attname)::regclass::oid
                WHERE s.relname = $1 AND a.attnum > 0 AND NOT a.attisdropped
            `, [seqName]);

            if (colRes.rows.length > 0) {
                const { table_name, column_name } = colRes.rows[0];
                
                const maxValResult = await client.query(`SELECT MAX(${client.escapeIdentifier(column_name)}) as max_val FROM ${client.escapeIdentifier(table_name)}`);
                const maxVal = maxValResult.rows[0].max_val; // This can be null

                // If the table is empty, maxVal will be null. We should reset the sequence to 1.
                // If there are values, we set the sequence to the max value, and the next call will be maxVal + 1.
                const resetValue = maxVal || 1;
                const isCalled = maxVal !== null;

                await client.query(`SELECT setval('${client.escapeIdentifier(seqName)}', ${resetValue}, ${isCalled})`);
                console.log(`Sequence ${seqName} for ${table_name}.${column_name} reset.`);
            }
        }
        console.log('All database sequences reset successfully.');
    } catch (error) {
        console.error('Error resetting sequences:', error);
        throw error;
    } finally {
        client.release();
    }
}


module.exports.globalTestPool = pool;

module.exports = async () => {
  console.log('Connecting to database: ' + process.env.DB_NAME);
  global.testPool = pool; // Make the pool globally available
  try {
    await dropAllTables(pool);
    await applyMigrations(pool);
    await applyDMLScripts(pool);
    await resetSequences(pool); // Run the robust reset function
    console.log('Test database schema created successfully.');
    
    // Clear module cache to ensure app re-initializes with the test environment
    delete require.cache[require.resolve('./app')];

  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  }
};