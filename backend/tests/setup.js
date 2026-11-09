require('dotenv').config();
const mongoose = require('mongoose');
const os = require('os');

const sanitize = (value) =>
  String(value)
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 48);

/**
 * Build a dedicated database URI for this Jest test file.
 *
 * Each file gets its own database (e.g. queueless_test_e2e_patient_flow) which is
 * dropped before the suite runs, so audit runs are deterministic and never touch
 * the development database configured in MONGODB_URI.
 */
const buildTestUri = () => {
  const configured =
    process.env.MONGODB_URI_TEST ||
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/queueless';

  const parsed = new URL(configured);
  const baseDb = sanitize((parsed.pathname || '/queueless').replace(/^\//, '') || 'queueless');
  const testFile = sanitize(
    (expect.getState().testPath || 'suite')
      .split(/[\\/]/)
      .pop()
      .replace(/\.test\.js$/, '')
  );

  // Node 24 resolves localhost to ::1 first on some Windows setups, while the
  // local mongod only listens on 127.0.0.1.
  if (parsed.hostname === 'localhost') {
    parsed.hostname = '127.0.0.1';
  }

  parsed.pathname = `/${baseDb}_test_${testFile}`;
  return parsed.toString();
};

beforeAll(async () => {
  const uri = buildTestUri();

  if (!/_test_/.test(uri)) {
    throw new Error(`Refusing to run tests against a non-test database: ${uri}`);
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      // Workaround for NODE-7832: mongodb driver 7.6+ builds an invalid client
      // metadata handshake under Jest's module environment, which MongoDB 8.2
      // rejects with "Missing required sub-document 'driver'".
      runtimeAdapters: { os },
    });
  }

  await mongoose.connection.db.dropDatabase();

  // Rebuild unique indexes (e.g. token number per queue) after dropping the DB.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}, 60000);

afterAll(async () => {
  // Close the Socket.IO server created by src/server.js so Jest does not hang.
  try {
    const { io } = require('../src/server');
    if (io) io.close();
  } catch (error) {
    // Server module not loaded by this suite; nothing to close.
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}, 60000);
