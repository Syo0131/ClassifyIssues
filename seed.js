const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;

    const [key, ...rest] = line.split('=');
    const value = rest.join('=').trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function getClientConfig() {
  const connectionString = (process.env.DATABASE_URL || '').trim();
  if (connectionString) {
    return { connectionString };
  }

  return {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  };
}

async function seed() {
  const client = new Client(getClientConfig());
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'technician')),
      projects JSONB NOT NULL DEFAULT '[]'::jsonb
    );
  `);

  const username = 'admin';
  const password = 'admin123';
  const role = 'technician';
  const hash = await bcrypt.hash(password, 10);

  try {
    await client.query(
      `INSERT INTO users (username, password_hash, role, projects)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [username, hash, role, JSON.stringify([])]
    );
    console.log('Admin user created successfully: admin / admin123');
  } catch (e) {
    if (e.code === '23505') {
      console.log('Admin user already exists.');
    } else {
      console.error('Error seeding admin user:', e);
    }
  } finally {
    await client.end();
  }
}

seed().catch((error) => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
