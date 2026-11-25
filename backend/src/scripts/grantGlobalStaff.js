#!/usr/bin/env node
/**
 * Grants the global staff permission to the designated demo staff account only.
 *
 * The permission is stored as User.isGlobalStaff and is read by
 * src/middleware/roles.js on every request. Global access is per account, not
 * per hospital, so hospitals created, approved or activated later become
 * available automatically with no further assignment rows or migrations.
 *
 * Safety rules:
 *  - Read-only by default. Pass --apply to actually write.
 *  - Targets exactly one email. It never grants the permission to any other
 *    account, and never creates, deletes or overwrites users.
 *  - Never changes a password, role, hospital assignment or any other field.
 *  - Idempotent: an account that already holds the permission is left untouched.
 *  - Refuses to connect to a non-local MongoDB host unless --allow-remote is
 *    passed explicitly.
 *
 * Usage:
 *   node src/scripts/grantGlobalStaff.js                        # dry run, local URI
 *   node src/scripts/grantGlobalStaff.js --apply                # grant, local URI
 *   node src/scripts/grantGlobalStaff.js --apply --allow-remote # explicit remote run
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const GLOBAL_STAFF_EMAIL = 'demo@hospital.com';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const ALLOW_REMOTE = args.has('--allow-remote');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const log = (...parts) => console.log(...parts);
const warn = (...parts) => console.warn('WARNING:', ...parts);

const redactUri = (uri) => {
  try {
    const parsed = new URL(uri);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch (error) {
    return '(unparseable MongoDB URI)';
  }
};

const isLocalUri = (uri) => {
  try {
    return LOCAL_HOSTS.has(new URL(uri).hostname);
  } catch (error) {
    return false;
  }
};

const run = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/queueless';

  log(`Mode:      ${APPLY ? 'APPLY (writes enabled)' : 'DRY RUN (no writes)'}`);
  log(`MongoDB:   ${redactUri(mongoUri)}`);
  log(`Account:   ${GLOBAL_STAFF_EMAIL}`);

  if (!isLocalUri(mongoUri) && !ALLOW_REMOTE) {
    console.error(
      '\nRefusing to run against a non-local MongoDB host.\n' +
        'Re-run with --allow-remote only when you intend to modify that database.\n'
    );
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

  try {
    const user = await User.findOne({ email: GLOBAL_STAFF_EMAIL });

    if (!user) {
      warn(
        `No account exists with email ${GLOBAL_STAFF_EMAIL}. ` +
          'This script never creates accounts; create or seed the demo staff account first.'
      );
      return 2;
    }

    log(`\nFound account [${user._id}]`);
    log(`  name:        ${user.name}`);
    log(`  role:        ${user.role}`);
    log(`  staffRole:   ${user.staffRole || '(none)'}`);
    log(`  hospitalId:  ${user.hospitalId || '(none)'}`);
    log(`  isGlobalStaff: ${user.isGlobalStaff === true}`);

    if (user.role !== 'staff') {
      warn(
        `Account role is "${user.role}", not "staff". The global staff permission only ` +
          'applies to staff accounts, so nothing was changed.'
      );
      return 2;
    }

    if (user.isGlobalStaff === true) {
      log('\nNothing to do. This account already holds the global staff permission.');
      return 0;
    }

    if (!APPLY) {
      log('\nDry run only. Re-run with --apply to grant the global staff permission.');
      return 0;
    }

    // Update just this field so password, role and hospital assignment survive.
    await User.updateOne({ _id: user._id, role: 'staff' }, { $set: { isGlobalStaff: true } });
    log('\nGranted the global staff permission. No other field was modified.');
    log('The account will see every hospital, including ones created later.');
    return 0;
  } finally {
    await mongoose.disconnect();
  }
};

run()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error('Granting global staff access failed:', error.message);
    process.exitCode = 1;
  });
