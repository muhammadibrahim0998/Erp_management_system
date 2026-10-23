const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

// ============================================================================
// ENVIRONMENT & SAFETY GUARDS
// ============================================================================
const nodeEnv = process.env.NODE_ENV || 'test';
if (nodeEnv === 'production') {
  console.error('FATAL SAFETY VIOLATION: Tests must never execute in a production environment.');
  process.exit(1);
}

const currentDb = process.env.DB_NAME || '';
const isTestDb = currentDb.toLowerCase().endsWith('_test') || currentDb === 'yaf_erp_test';
if (!isTestDb) {
  console.error(`\n====================================================================`);
  console.error(`FATAL SAFETY REFUSAL: Unverified or non-test database configuration.`);
  console.error(`Active DB_NAME: "${currentDb || '(empty - defaults to dev/prod)'}"`);
  console.error(`Tests are strictly blocked from running against development or production databases.`);
  console.error(`To run tests safely, provide an isolated test database:`);
  console.error(`  DB_NAME=yaf_erp_test node backend/tests/preStagingHardeningPhase1.test.js`);
  console.error(`====================================================================\n`);
  process.exit(1);
}

const { db } = require('../config/db');
const {
  app,
  resolveTrustProxy,
  securityHeadersMiddleware
} = require('../server');
const {
  errorHandler,
  productionResponseSanitizer
} = require('../middlewares/errorHandler');

async function makeRequest(port, options = {}, requestBody = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path || '/',
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = null;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          rawBody: data,
          json
        });
      });
    });

    req.on('error', reject);

    if (requestBody) {
      if (typeof requestBody === 'object') {
        req.write(JSON.stringify(requestBody));
      } else {
        req.write(String(requestBody));
      }
    }
    req.end();
  });
}

async function runPreStagingHardeningTestSuite() {
  console.log('====================================================================');
  console.log('YOUSAFZAI AGRI FOODS ERP — PRE-STAGING HARDENING PHASE 1 TEST SUITE');
  console.log('====================================================================');
  console.log(`[Safety Guard] Node Environment: ${nodeEnv}`);
  console.log(`[Safety Guard] Database Target:   ${currentDb} (ISOLATED TEST DATABASE)`);

  const [dbNameRows] = await db.query('SELECT DATABASE() as active_db');
  const activeDbName = dbNameRows[0]?.active_db;
  assert.strictEqual(
    activeDbName,
    currentDb,
    `Active database mismatch: Expected ${currentDb}, got ${activeDbName}`
  );
  console.log(`[Safety Guard] Verified Connection: Connected to "${activeDbName}"`);

  let passedTests = 0;
  let totalTests = 0;

  function recordPass(testName) {
    totalTests++;
    passedTests++;
    console.log(`  PASS: [${String(totalTests).padStart(2, '0')}] ${testName}`);
  }

  // --------------------------------------------------------------------------
  // SECTION 1: PROXY TRUST CONFIGURATION VALIDATION (resolveTrustProxy)
  // --------------------------------------------------------------------------
  console.log('\n--- PART 1: REVERSE PROXY TRUST CONFIGURATION ---');

  // Test 01: Default when unset is false
  assert.strictEqual(resolveTrustProxy({}), false);
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: '' }), false);
  recordPass('resolveTrustProxy defaults safely to false when unset or empty');

  // Test 02: Explicit false or 0 returns false
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: 'false' }), false);
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: '0' }), false);
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: '  false  ' }), false);
  recordPass('resolveTrustProxy returns false for explicit false or 0');

  // Test 03: Rejects TRUST_PROXY=true in production mode
  assert.throws(
    () => resolveTrustProxy({ TRUST_PROXY: 'true', NODE_ENV: 'production' }),
    /TRUST_PROXY cannot be set to "true" in production/
  );
  recordPass('resolveTrustProxy throws when TRUST_PROXY=true in production');

  // Test 04: Allows TRUST_PROXY=true in non-production environments
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: 'true', NODE_ENV: 'development' }), true);
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: 'true', NODE_ENV: 'test' }), true);
  recordPass('resolveTrustProxy permits TRUST_PROXY=true in development/test');

  // Test 05: Standard keywords supported
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: 'loopback' }), 'loopback');
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: 'LOOPBACK' }), 'loopback');
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: 'linklocal' }), 'linklocal');
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: 'uniquelocal' }), 'uniquelocal');
  recordPass('resolveTrustProxy recognizes standard keywords (loopback, linklocal, uniquelocal)');

  // Test 06: Numeric hop count parsed cleanly
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: '1' }), 1);
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: '2' }), 2);
  recordPass('resolveTrustProxy parses positive integer hop count');

  // Test 07: Valid IP and CIDR configurations
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: '127.0.0.1' }), '127.0.0.1');
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: '127.0.0.1,::1' }), '127.0.0.1,::1');
  assert.strictEqual(resolveTrustProxy({ TRUST_PROXY: '10.0.0.0/8' }), '10.0.0.0/8');
  recordPass('resolveTrustProxy accepts valid IPs and subnets/CIDRs');

  // Test 08: Invalid IP or subnet throws descriptive error
  assert.throws(
    () => resolveTrustProxy({ TRUST_PROXY: 'invalid-subnet-address' }),
    /Invalid TRUST_PROXY configuration/
  );
  recordPass('resolveTrustProxy rejects malformed IP or subnet with clear error');

  // --------------------------------------------------------------------------
  // SECTION 2: PRODUCTION 500 ERROR SANITIZATION
  // --------------------------------------------------------------------------
  console.log('\n--- PART 2: HTTP 500 RESPONSE SANITIZATION ---');

  // Test 09: errorHandler sanitizes 500 errors in production
  {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    let capturedStatusCode = null;
    let capturedBody = null;
    const mockRes = {
      statusCode: 200,
      headersSent: false,
      status(code) {
        capturedStatusCode = code;
        return this;
      },
      json(body) {
        capturedBody = body;
        return this;
      }
    };

    const mockErr = new Error("Table 'Erp_management.users' doesn't exist at MySQLConnection.execute");
    mockErr.statusCode = 500;

    // Suppress console.error during expected test invocation
    const originalConsoleError = console.error;
    let loggedError = null;
    console.error = (...args) => {
      loggedError = args.join(' ');
    };

    try {
      errorHandler(mockErr, {}, mockRes, () => {});
    } finally {
      console.error = originalConsoleError;
      process.env.NODE_ENV = prevNodeEnv;
    }

    assert.strictEqual(capturedStatusCode, 500);
    assert.strictEqual(capturedBody.error, 'Internal Server Error');
    assert.strictEqual(capturedBody.stack, undefined);
    assert(loggedError.includes("Table 'Erp_management.users' doesn't exist"), 'Server-side log preserved');
    recordPass('errorHandler returns generic "Internal Server Error" in production while logging server diagnostics');
  }

  // Test 10: errorHandler preserves 4xx client error messages in production
  {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    let capturedStatusCode = null;
    let capturedBody = null;
    const mockRes = {
      statusCode: 200,
      headersSent: false,
      status(code) {
        capturedStatusCode = code;
        return this;
      },
      json(body) {
        capturedBody = body;
        return this;
      }
    };

    const mockErr = new Error('Invalid email address format');
    mockErr.statusCode = 400;

    const originalConsoleWarn = console.warn;
    console.warn = () => {};
    try {
      errorHandler(mockErr, {}, mockRes, () => {});
    } finally {
      console.warn = originalConsoleWarn;
      process.env.NODE_ENV = prevNodeEnv;
    }

    assert.strictEqual(capturedStatusCode, 400);
    assert.strictEqual(capturedBody.error, 'Invalid email address format');
    recordPass('errorHandler preserves client error messages (4xx) in production');
  }

  // Test 11: errorHandler preserves detailed error in development/test
  {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    let capturedStatusCode = null;
    let capturedBody = null;
    const mockRes = {
      statusCode: 200,
      headersSent: false,
      status(code) {
        capturedStatusCode = code;
        return this;
      },
      json(body) {
        capturedBody = body;
        return this;
      }
    };

    const mockErr = new Error('SQL Syntax Error in query');
    mockErr.statusCode = 500;

    const originalConsoleError = console.error;
    console.error = () => {};
    try {
      errorHandler(mockErr, {}, mockRes, () => {});
    } finally {
      console.error = originalConsoleError;
      process.env.NODE_ENV = prevNodeEnv;
    }

    assert.strictEqual(capturedStatusCode, 500);
    assert.strictEqual(capturedBody.error, 'SQL Syntax Error in query');
    assert.ok(capturedBody.stack, 'Stack trace present in development');
    recordPass('errorHandler preserves detailed error message and stack in development');
  }

  // Test 12: productionResponseSanitizer intercepts direct res.status(500).json in production
  {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    let capturedBody = null;
    const mockRes = {
      statusCode: 500,
      json(body) {
        capturedBody = body;
        return this;
      }
    };

    let nextCalled = false;
    productionResponseSanitizer({}, mockRes, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);

    // Controller calls res.json with internal error message
    mockRes.json({ error: 'connect ECONNREFUSED 127.0.0.1:3306' });
    process.env.NODE_ENV = prevNodeEnv;

    assert.strictEqual(capturedBody.error, 'Internal Server Error');
    recordPass('productionResponseSanitizer sanitizes direct 500 JSON controller responses in production');
  }

  // Test 13: productionResponseSanitizer preserves direct 4xx responses in production
  {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    let capturedBody = null;
    const mockRes = {
      statusCode: 404,
      json(body) {
        capturedBody = body;
        return this;
      }
    };

    productionResponseSanitizer({}, mockRes, () => {});
    mockRes.json({ error: 'Customer record not found' });
    process.env.NODE_ENV = prevNodeEnv;

    assert.strictEqual(capturedBody.error, 'Customer record not found');
    recordPass('productionResponseSanitizer does not touch 4xx responses in production');
  }

  // --------------------------------------------------------------------------
  // SECTION 3: REVERSE PROXY INTEGRATION & HSTS
  // --------------------------------------------------------------------------
  console.log('\n--- PART 3: PROXY TRUST & SECURITY HEADERS BEHAVIOR ---');

  // Test 14: App with trust proxy: 'loopback' recognizes X-Forwarded-Proto from loopback
  {
    const testApp = express();
    testApp.set('trust proxy', 'loopback');
    testApp.use(securityHeadersMiddleware);
    testApp.get('/test-proxy-hsts', (req, res) => {
      res.json({ secure: req.secure, ip: req.ip });
    });

    const testServer = http.createServer(testApp);
    await new Promise((resolve) => testServer.listen(0, resolve));
    const testPort = testServer.address().port;

    const prevHsts = process.env.ENABLE_HSTS;
    process.env.ENABLE_HSTS = 'true';

    try {
      const resSecure = await makeRequest(testPort, {
        path: '/test-proxy-hsts',
        headers: {
          'X-Forwarded-Proto': 'https'
        }
      });
      assert.strictEqual(resSecure.statusCode, 200);
      assert.strictEqual(resSecure.json.secure, true);
      assert.ok(resSecure.headers['strict-transport-security'], 'HSTS header must be present for verified secure request');

      const resInsecure = await makeRequest(testPort, {
        path: '/test-proxy-hsts',
        headers: {
          'X-Forwarded-Proto': 'http'
        }
      });
      assert.strictEqual(resInsecure.statusCode, 200);
      assert.strictEqual(resInsecure.json.secure, false);
      assert.strictEqual(resInsecure.headers['strict-transport-security'], undefined);
    } finally {
      if (prevHsts === undefined) delete process.env.ENABLE_HSTS;
      else process.env.ENABLE_HSTS = prevHsts;
      await new Promise((resolve) => testServer.close(resolve));
    }

    recordPass('Trust proxy "loopback" correctly reflects req.secure and emits HSTS only on verified HTTPS');
  }

  // Test 15: App with trust proxy: false ignores X-Forwarded-Proto
  {
    const testApp = express();
    testApp.set('trust proxy', false);
    testApp.use(securityHeadersMiddleware);
    testApp.get('/test-no-trust', (req, res) => {
      res.json({ secure: req.secure });
    });

    const testServer = http.createServer(testApp);
    await new Promise((resolve) => testServer.listen(0, resolve));
    const testPort = testServer.address().port;

    const prevHsts = process.env.ENABLE_HSTS;
    process.env.ENABLE_HSTS = 'true';

    try {
      const res = await makeRequest(testPort, {
        path: '/test-no-trust',
        headers: {
          'X-Forwarded-Proto': 'https'
        }
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.json.secure, false);
      assert.strictEqual(res.headers['strict-transport-security'], undefined, 'No HSTS when proxy trust is disabled');
    } finally {
      if (prevHsts === undefined) delete process.env.ENABLE_HSTS;
      else process.env.ENABLE_HSTS = prevHsts;
      await new Promise((resolve) => testServer.close(resolve));
    }

    recordPass('trust proxy false strictly ignores spoofed X-Forwarded-Proto: https');
  }

  // --------------------------------------------------------------------------
  // SECTION 4: DOCKER COMPOSE CONFIGURATION INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\n--- PART 4: DOCKER COMPOSE HOST BINDING INTEGRITY ---');

  // Test 16: docker-compose.yml strictly restricts MySQL to 127.0.0.1:3306
  {
    const dockerComposePath = path.resolve(__dirname, '../../docker-compose.yml');
    const content = fs.readFileSync(dockerComposePath, 'utf8');

    // Must not have public "3306:3306"
    assert.doesNotMatch(
      content,
      /^\s*-\s*["']3306:3306["']/m,
      'docker-compose.yml must not expose 3306 directly without loopback binding'
    );
    // Must contain 127.0.0.1:3306:3306
    assert.match(
      content,
      /127\.0\.0\.1:3306:3306/,
      'docker-compose.yml must bind MySQL port explicitly to 127.0.0.1:3306:3306'
    );
    recordPass('docker-compose.yml binds MySQL host port exclusively to 127.0.0.1');
  }

  // --------------------------------------------------------------------------
  // SECTION 5: .ENV.EXAMPLE INTEGRITY & SECRET HYGIENE
  // --------------------------------------------------------------------------
  console.log('\n--- PART 5: .ENV.EXAMPLE INTEGRITY & SECRET HYGIENE ---');

  // Test 17: .env.example contains all required/optional variables and zero real secrets
  {
    const envExamplePath = path.resolve(__dirname, '../../.env.example');
    const content = fs.readFileSync(envExamplePath, 'utf8');

    const requiredVars = [
      'PORT',
      'NODE_ENV',
      'TRUST_PROXY',
      'ALLOWED_ORIGINS',
      'ENABLE_HSTS',
      'DB_HOST',
      'DB_PORT',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME',
      'JWT_SECRET',
      'ERP_CREDIT_LOCK_TIMEOUT_SECONDS',
      'ERP_DEFAULT_UNVETTED_CREDIT_LIMIT',
      'SEED_DEMO_DATA',
      'VITE_API_URL'
    ];

    for (const v of requiredVars) {
      assert.ok(content.includes(`${v}=`), `.env.example must define template for ${v}`);
    }

    // Verify secret hygiene: no hardcoded JWT secrets
    assert.doesNotMatch(
      content,
      /JWT_SECRET=yaf_super_secure/,
      '.env.example must not contain real or hardcoded project JWT secrets'
    );
    assert.doesNotMatch(
      content,
      /DB_PASSWORD=rootpassword/,
      '.env.example must not contain real database passwords'
    );
    recordPass('.env.example documents all configuration keys with safe placeholders and zero secrets');
  }

  console.log('\n====================================================================');
  console.log(`Final Result: ${passedTests} / ${totalTests} tests passed.`);
  console.log('====================================================================\n');
}

runPreStagingHardeningTestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test Suite Execution Failed:');
    console.error(err);
    process.exit(1);
  });
