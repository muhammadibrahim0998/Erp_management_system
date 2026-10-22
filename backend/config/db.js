const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const fs = require('fs');

dotenv.config();

// Check for local MySQL sockets on macOS/Linux
const socketCandidates = [
  process.env.DB_SOCKET,
  '/opt/local/var/run/mysql8/mysqld.sock',
  '/tmp/mysql.sock',
  '/var/run/mysqld/mysqld.sock',
  '/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock'
].filter(Boolean);

const activeSocket = socketCandidates.find(p => {
  try {
    return fs.existsSync(p);
  } catch (e) {
    return false;
  }
});

const poolConfig = {
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'Erp_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

if (activeSocket && (!process.env.DB_HOST || process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1')) {
  poolConfig.socketPath = activeSocket;
} else {
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = Number(process.env.DB_PORT) || 3306;
}

// Create connection pool for MySQL
const pool = mysql.createPool(poolConfig);

// Function to test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ Successfully connected to MySQL database: "${process.env.DB_NAME || 'Erp_management'}"`);
    connection.release();
    return { success: true };
  } catch (error) {
    console.error('❌ MySQL Connection Failed:');
    console.error(`   Error Message: ${error.message}`);
    console.error(`   Tip: Check DB_USER, DB_PASSWORD, and ensure MySQL (e.g. XAMPP/WAMP/MySQL Service) is running.`);
    return { success: false, error: error.message };
  }
};

module.exports = {
  db: pool,
  testConnection,
};
