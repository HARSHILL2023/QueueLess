#!/usr/bin/env node
/**
 * Creates the first platform administrator (role: 'admin') for QueueLess.
 *
 * This is the only supported way to bootstrap a platform admin without editing
 * the database by hand. It is deliberately conservative:
 *
 *  - Dry run by default. Pass --apply to actually write anything.
 *  - Refuses a non-local MongoDB host unless --allow-remote is passed explicitly.
 *  - The initial password comes from the ADMIN_INITIAL_PASSWORD environment
 *    variable. It is never printed, never logged and never stored in the repo.
 *  - Idempotent: an existing account for ADMIN_EMAIL is never modified. If it is
 *    already a platform admin the script reports that and exits successfully; if
 *    it belongs to another role the script stops without changing anything.
 *  - Never deletes users, hospitals, departments, queues or tokens.
 *  - Uses User.create() so the existing bcrypt pre-save hook hashes the password.
 *
 * Usage:
 *   ADMIN_EMAIL=owner@example.com ADMIN_INITIAL_PASSWORD='...' \
 *     node src/scripts/seedAdmin.js                       # dry run, local MongoDB
 *
 *   ADMIN_EMAIL=owner@example.com ADMIN_INITIAL_PASSWORD='...' \
 *     node src/scripts/seedAdmin.js --apply               # create, local MongoDB
 *
 *   ADMIN_EMAIL=owner@example.com ADMIN_INITIAL_PASSWORD='...' \
 *     node src/scripts/seedAdmin.js --apply --allow-remote   # explicit Atlas run
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const ALLOW_REMOTE = args.has('--allow-remote');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const MASKED_PASSWORD = '[hidden]';

const log = (...parts) => console.log(...parts);
const fail = (message, code = 1) => {
  console.error(`\n${message}\n`);
  process.exitCode = code;
};

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

const readConfig = () => {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const name = (process.env.ADMIN_NAME || 'Platform Owner').trim();
  const password = process.env.ADMIN_INITIAL_PASSWORD || '';
  const phone = (process.env.ADMIN_PHONE || '').trim();

  const problems = [];

  if (!email) problems.push('ADMIN_EMAIL is required.');
  if (email && !/^\S+@\S+\.\S+$/.test(email)) problems.push('ADMIN_EMAIL must be a valid email address.');
  if (!password) problems.push('ADMIN_INITIAL_PASSWORD is required.');
  if (password && password.length < 8) problems.push('ADMIN_INITIAL_PASSWORD must be at least 8 characters.');
  if (name.length < 2) problems.push('ADMIN_NAME must be at least 2 characters.');

  return { email, name, password, phone, problems };
};

const run = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/queueless';
  const config = readConfig();

  log('QueueLess platform administrator bootstrap');
  log('------------------------------------------');
  log(`Mode:      ${APPLY ? 'APPLY (writes enabled)' : 'DRY RUN (no writes)'}`);
  log(`MongoDB:   ${redactUri(mongoUri)}`);
  log(`Email:     ${config.email || '(ADMIN_EMAIL not set)'}`);
  log(`Name:      ${config.name}`);
  log(`Password:  ${config.password ? MASKED_PASSWORD : '(ADMIN_INITIAL_PASSWORD not set)'}`);

  if (config.problems.length > 0) {
    return fail(`Cannot continue:\n  - ${config.problems.join('\n  - ')}`);
  }

  if (!isLocalUri(mongoUri) && !ALLOW_REMOTE) {
    return fail(
      'Refusing to run against a non-local MongoDB host.\n' +
        'Re-run with --allow-remote only when you intend to modify that database.'
    );
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

  try {
    const existing = await User.findOne({ email: config.email }).select('+password');

    if (existing) {
      log(`\nAccount already exists [${existing._id}].`);
      log(`  role:      ${existing.role}`);
      log(`  staffRole: ${existing.staffRole || '(none)'}`);
      log(`  status:    ${existing.status || 'active'}`);

      if (existing.role === 'admin') {
        log('\nThis account is already a platform administrator. Nothing to do.');
        log('Its password was not read, changed or printed.');
        return 0;
      }

      return fail(
        `An account with ${config.email} already exists with role "${existing.role}".\n` +
          'Nothing was changed. Use a different ADMIN_EMAIL, or resolve the existing\n' +
          'account manually if it really should become a platform administrator.',
        2
      );
    }

    log('\nPlan:');
    log(`  CREATE platform administrator ${config.email} (role: admin)`);
    log('  Existing users, hospitals, departments, queues and tokens: untouched');

    if (!APPLY) {
      log('\nDry run only. Re-run with --apply to create the administrator.');
      return 0;
    }

    // User.create() runs the existing bcrypt pre-save hook.
    const admin = await User.create({
      name: config.name,
      email: config.email,
      password: config.password,
      phone: config.phone,
      role: 'admin',
      isVerified: true,
      status: 'active',
    });

    log(`\nCreated platform administrator [${admin._id}].`);
    log('Sign in with the email and password you provided, then open /admin.');
    return 0;
  } finally {
    await mongoose.disconnect();
  }
};

run()
  .then((code) => {
    if (typeof code === 'number') process.exitCode = code;
  })
  .catch((error) => {
    console.error('Platform administrator bootstrap failed:', error.message);
    process.exitCode = 1;
  });
