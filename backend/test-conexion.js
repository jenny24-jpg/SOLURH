const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.fuiyjoonclnmqcpmwuwh:SCdinosaurio24@aws-1-us-west-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

client.connect()
  .then(() => client.query('SELECT NOW()'))
  .then((res) => {
    console.log('✅ CONEXIÓN EXITOSA:', res.rows[0]);
    client.end();
  })
  .catch((err) => {
    console.error('❌ ERROR DE CONEXIÓN:', err);
    process.exit(1);
  });
