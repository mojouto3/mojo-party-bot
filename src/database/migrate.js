require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function migrate() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set in .env');
        process.exit(1);
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    try {
        console.log('Running schema.sql...');
        await pool.query(sql);
        console.log('Database updated successfully.');
    } catch (err) {
        console.error('Migration error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
