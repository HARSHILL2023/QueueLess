#!/usr/bin/env node
/**
 * Creates the demo hospital-staff account (staff@hospital.com / Password123!)
 * without touching any other data.
 *
 * This script is deliberately separate from src/scripts/seed.js, which wipes
 * collections before reseeding and must never be run against production.
 *
 * Safety rules:
 *  - Read-only by default. Pass --apply to actually write.
 *  - Idempotent: existing users, hospitals and departments are reused as-is.
 *  - Never deletes, updates or overwrites existing records. If the demo account
 *    already exists with a different password or role, the script reports it and
 *    exits without changes.
 *  - Refuses to connect to a non-local MongoDB host unless --allow-remote is
 *    passed explicitly, so a stray MONGODB_URI cannot be modified by accident.
 *
 * Usage:
 *   node src/scripts/seedDemoStaff.js                     # dry run, local URI
 *   node src/scripts/seedDemoStaff.js --apply             # create, local URI
 *   node src/scripts/seedDemoStaff.js --apply --allow-remote  # explicit remote run
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Department = require('../models/Department');

const DEMO_STAFF = {
  name: 'Demo Hospital Staff',
  email: 'staff@hospital.com',
  password: 'Password123!',
  phone: '+91 99000 00002',
  role: 'staff',
  staffRole: 'doctor',
  isVerified: true,
};

const FALLBACK_HOSPITAL = {
  name: 'QueueLess Demo Hospital',
  code: 'QLDEMO',
  description: 'Demo hospital created by the seed:demo-staff script.',
  address: {
    street: '1 Demo Health Street',
    city: 'Ahmedabad',
    state: 'Gujarat',
    zipCode: '380015',
    country: 'India',
  },
  phone: '+91 79 0000 0000',
  email: 'demo@hospital.com',
  isVerified: true,
  status: 'active',
};

const FALLBACK_DEPARTMENT = {
  name: 'General Medicine',
  code: 'GEN',
  description: 'General outpatient consultations.',
  floor: 'Ground Floor',
  roomNumber: '101',
  avgWaitMinutes: 15,
  maxTokensPerDay: 100,
  isActive: true,
};

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

/**
 * Reuse the healthiest existing hospital, or create the minimum viable one.
 * Never modifies an existing hospital, even if it is missing optional fields.
 */
const resolveHospital = async () => {
  const verified = await Hospital.findOne({ isVerified: true, status: 'active' }).sort({
    createdAt: 1,
    _id: 1,
  });
  if (verified) return { hospital: verified, created: false };

  const anyHospital = await Hospital.findOne({}).sort({ createdAt: 1, _id: 1 });
  if (anyHospital) {
    warn(
      `No verified/active hospital found. Reusing existing hospital "${anyHospital.name}" ` +
        `(status: ${anyHospital.status}, isVerified: ${anyHospital.isVerified}) without modifying it.`
    );
    return { hospital: anyHospital, created: false };
  }

  return { hospital: FALLBACK_HOSPITAL, created: true };
};

const resolveDepartment = async (hospital) => {
  const active = await Department.findOne({ hospitalId: hospital._id, isActive: true }).sort({
    createdAt: 1,
    _id: 1,
  });
  if (active) return { department: active, created: false };

  const anyDepartment = await Department.findOne({ hospitalId: hospital._id }).sort({
    createdAt: 1,
    _id: 1,
  });
  if (anyDepartment) {
    warn(
      `No active department found for "${hospital.name}". Reusing existing department ` +
        `"${anyDepartment.name}" (isActive: ${anyDepartment.isActive}) without modifying it.`
    );
    return { department: anyDepartment, created: false };
  }

  return { department: FALLBACK_DEPARTMENT, created: true };
};

const describe = (doc) =>
  `${doc.name} (${doc.code || doc.email}) [${doc._id || 'new'}]`;

const run = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/queueless';

  log(`Mode:      ${APPLY ? 'APPLY (writes enabled)' : 'DRY RUN (no writes)'}`);
  log(`MongoDB:   ${redactUri(mongoUri)}`);

  if (!isLocalUri(mongoUri) && !ALLOW_REMOTE) {
    console.error(
      '\nRefusing to run against a non-local MongoDB host.\n' +
        'Re-run with --allow-remote only when you intend to modify that database.\n'
    );
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

  try {
    // 1. Demo account already present?
    const existingUser = await User.findOne({ email: DEMO_STAFF.email }).select('+password');
    if (existingUser) {
      const passwordMatches = await existingUser.comparePassword(DEMO_STAFF.password);

      log(`\nUser "${DEMO_STAFF.email}" already exists [${existingUser._id}].`);
      log(`  role:        ${existingUser.role}`);
      log(`  staffRole:   ${existingUser.staffRole || '(none)'}`);
      log(`  hospitalId:  ${existingUser.hospitalId || '(none)'}`);
      log(`  departmentId:${existingUser.departmentId || '(none)'}`);
      log(`  password:    ${passwordMatches ? 'matches demo credentials' : 'DOES NOT match demo password'}`);

      if (passwordMatches && existingUser.role === 'staff') {
        log('\nNothing to do. The demo staff account is ready and was not modified.');
        return 0;
      }

      if (existingUser.role !== 'staff') {
        warn(
          `Existing account has role "${existingUser.role}", not "staff". ` +
            'The script will not change it. Resolve this manually if needed.'
        );
        return 2;
      }

      warn(
        'Existing account has a different password. The script never overwrites passwords, ' +
          'so no changes were made. Reset the password manually if the demo login must work.'
      );
      return 2;
    }

    // 2. Hospital and department to attach the staff member to.
    const { hospital, created: hospitalCreated } = await resolveHospital();
    log(
      `\nHospital:   ${hospitalCreated ? 'CREATE ' : 'reuse  '}${describe(hospital)}`
    );

    const { department, created: departmentCreated } = await resolveDepartment(hospital);
    log(
      `Department: ${departmentCreated ? 'CREATE ' : 'reuse  '}${describe(department)}`
    );

    log(`\nStaff user: CREATE ${DEMO_STAFF.email} (role: ${DEMO_STAFF.role}, staffRole: ${DEMO_STAFF.staffRole})`);

    if (!APPLY) {
      log('\nDry run only. Re-run with --apply to create the missing records.');
      return 0;
    }

    // 3. Create only what is missing. User.create() triggers the bcrypt pre-save hook.
    let hospitalId = hospital._id;
    if (hospitalCreated) {
      const createdHospital = await Hospital.create(FALLBACK_HOSPITAL);
      hospitalId = createdHospital._id;
      log(`Created hospital [${hospitalId}]`);
    }

    let departmentId = department._id;
    if (departmentCreated) {
      const createdDepartment = await Department.create({
        ...FALLBACK_DEPARTMENT,
        hospitalId,
      });
      departmentId = createdDepartment._id;
      log(`Created department [${departmentId}]`);
    }

    const staff = await User.create({
      name: DEMO_STAFF.name,
      email: DEMO_STAFF.email,
      password: DEMO_STAFF.password,
      phone: DEMO_STAFF.phone,
      role: DEMO_STAFF.role,
      staffRole: DEMO_STAFF.staffRole,
      hospitalId,
      departmentId,
      isVerified: DEMO_STAFF.isVerified,
    });

    log(`Created staff user [${staff._id}]`);
    log('\nDone. Demo staff login: staff@hospital.com / Password123!');
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
    console.error('Demo staff seed failed:', error.message);
    process.exitCode = 1;
  });