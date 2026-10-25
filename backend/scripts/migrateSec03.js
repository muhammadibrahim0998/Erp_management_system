/**
 * Standalone SEC-03 Database Migration Runner
 * Requires explicit operator invocation with CONFIRM_MIGRATE=true.
 * 
 * Usage:
 *   CONFIRM_MIGRATE=true node backend/scripts/migrateSec03.js
 * 
 * Safety invariants:
 * - Decoupled completely from server.js startup.
 * - Does not run during application boot.
 * - Must NOT be executed without explicit owner authorization.
 * - Non-transactional DDL notice: MySQL DDL commands implicitly commit and cannot be rolled back.
 *   Failures during migration require reviewing current schema and rerunning the idempotent script.
 */
const { db } = require('../config/db');
const { runSec03Migrations } = require('../initDb');

async function main() {
  // 1. Mandatory affirmative confirmation guard before any database interaction
  if (process.env.CONFIRM_MIGRATE !== 'true') {
    console.error('❌ Migration aborted: Explicit confirmation required.');
    console.error('Run with: CONFIRM_MIGRATE=true node backend/scripts/migrateSec03.js');
    process.exitCode = 1;
    return { success: false, error: 'Confirmation required' };
  }

  console.log('🚀 Starting SEC-03 Migration...');
  let conn = null;

  try {
    // 2. Safely acquire dedicated connection inside try block
    try {
      conn = await db.getConnection();
    } catch (connErr) {
      throw new Error(`Database connection acquisition failed: ${connErr.message}`);
    }

    // 3. Execute idempotent SEC-03 migrations
    await runSec03Migrations(conn);
    console.log('✨ SEC-03 Migration completed successfully.');
    process.exitCode = 0;
    return { success: true };
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
    return { success: false, error: err.message };
  } finally {
    // 4. Ensure connection is released exactly once if acquired, without process.exit() bypassing cleanup
    if (conn) {
      try {
        conn.release();
      } catch (relErr) {
        console.error('⚠️ Warning: Error releasing migration connection:', relErr.message);
      }
    }
  }
}

// 5. CLI entrypoint: Only executes when invoked directly from shell, never upon module import
if (require.main === module) {
  main().then((result) => {
    if (!result || !result.success) {
      process.exit(1);
    }
    process.exit(0);
  }).catch((fatalErr) => {
    console.error('❌ Fatal unhandled migration error:', fatalErr.message);
    process.exit(1);
  });
}

module.exports = { main };
