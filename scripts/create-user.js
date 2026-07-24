/**
 * Alta o actualización de un usuario desde la línea de comandos.
 *
 *   node scripts/create-user.js <usuario> <contraseña> [rol] [proyectos...]
 *
 * El rol por defecto es "user". Si el usuario ya existe, se actualizan su
 * contraseña, rol y proyectos (no se duplica).
 *
 * Complementa a seed.js, que sólo crea la cuenta inicial de arranque.
 */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const VALID_ROLES = ['user', 'technician', 'admin'];

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
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

async function main() {
  const [username, password, role = 'user', ...projects] = process.argv.slice(2);

  if (!username || !password) {
    console.error('Uso: node scripts/create-user.js <usuario> <contraseña> [rol] [proyectos...]');
    console.error(`Roles válidos: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  if (!VALID_ROLES.includes(role)) {
    console.error(`Rol no válido: "${role}". Usa uno de: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  loadEnvFile();
  const client = new Client(getClientConfig());
  await client.connect();

  try {
    // Las instalaciones creadas por seed.js tienen un CHECK que sólo admite
    // 'user' y 'technician', así que insertar un admin fallaría. Lo alineamos
    // con el esquema de src/lib/db.ts antes de escribir.
    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    await client.query(
      `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'technician', 'admin'))`
    );

    const hash = await bcrypt.hash(password, 10);
    const result = await client.query(
      `INSERT INTO users (username, password_hash, role, projects)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (username) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             projects = EXCLUDED.projects
       RETURNING id, username, role, (xmax = 0) AS inserted`,
      [username, hash, role, JSON.stringify(projects)]
    );

    const row = result.rows[0];
    console.log(
      `${row.inserted ? 'Usuario creado' : 'Usuario actualizado'}: ${row.username} (id ${row.id}, rol ${row.role})`
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Fallo al crear el usuario:', error.message);
  process.exit(1);
});
