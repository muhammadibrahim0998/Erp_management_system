const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool for MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'Erp_management',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

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
