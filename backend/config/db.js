const { Pool } = require('pg');
require('dotenv').config();

let pool;

async function initDB() {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await pool.query('SELECT NOW()');
    console.log('Pool de PostgreSQL (Supabase) creado correctamente');
  } catch (error) {
    console.error('Error creando pool de PostgreSQL:', error);
    throw error;
  }
}

async function getConnection() {
  return await pool.connect();
}

async function closeConnection(conn) {
  if (conn) {
    try {
      conn.release();
    } catch (error) {
      console.error('Error liberando conexión:', error);
    }
  }
}

async function closePool() {
  try {
    await pool.end();
    console.log('Pool de PostgreSQL cerrado');
  } catch (error) {
    console.error('Error cerrando pool:', error);
  }
}

module.exports = { initDB, getConnection, closeConnection, closePool };