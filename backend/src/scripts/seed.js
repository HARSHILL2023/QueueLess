require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
const Queue = require('../models/Queue');
const Token = require('../models/Token');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/queueless';
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB. Clearing existing seed data...');

    await Promise.all([
      User.deleteMany({}),
      Hospital.deleteMany({}),
      Department.deleteMany({}),
      Doctor.deleteMany({}),
      Queue.deleteMany({}),
      Token.deleteMany({}),
    ]);

    console.log('Creating Hospitals...');
    const hospital1 = await Hospital.create({
      name: 'Apex Central Multi-Speciality Hospital',
      code: 'ACH',
      description: 'Premier tertiary care hospital equipped with modern diagnostic facilities and virtual queue management.',
      address: {
        street: '100 Ring Road, Healthcare City',
        city: 'Ahmedabad',
        state: 'Gujarat',
        zipCode: '380015',
        country: 'India',
      },
      phone: '+91 79 2685 0000',
      email: 'contact@apexcentral.org',
      website: 'https://apexcentral.org',
      isVerified: true,
      status: 'active',
      settings: {
        openTime: '08:00',
        closeTime: '20:00',
        maxTokensPerDay: 300,
        avgConsultationMinutes: 15,
        allowOnlineBooking: true,
      },
    });

    const hospital2 = await Hospital.create({
      name: 'Metro City Health & Trauma Center',
      code: 'MCH',
      description: 'State-of-the-art super-speciality medical center with comprehensive outpatient departments.',
      address: {
        street: '45 Station Boulevard',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India',
      },
      phone: '+91 22 4500 1200',
      email: 'info@metrocityhealth.com',
      website: 'https://metrocityhealth.com',
      isVerified: true,
      status: 'active',
      settings: {
        openTime: '09:00',
        closeTime: '21:00',
        maxTokensPerDay: 250,
        avgConsultationMinutes: 15,
        allowOnlineBooking: true,
      },
    });

    console.log('Creating Departments for Apex Central Hospital...');
    const cardiology = await Department.create({
      hospitalId: hospital1._id,
      name: 'Cardiology',
      code: 'CARD',
      description: 'Heart care, ECG, echocardiography, and preventive cardiology outpatient services.',
      floor: '2nd Floor',
      roomNumber: '204',
      avgWaitMinutes: 15,
      maxTokensPerDay: 80,
      isActive: true,
    });

    const orthopedics = await Department.create({
      hospitalId: hospital1._id,
      name: 'Orthopedics & Joint Care',
      code: 'ORTH',
      description: 'Bone, joint, sports injury, and spine outpatient consultations.',
      floor: '1st Floor',
      roomNumber: '112',
      avgWaitMinutes: 20,
      maxTokensPerDay: 60,
      isActive: true,
    });

    const generalMedicine = await Department.create({
      hospitalId: hospital1._id,
      name: 'General Internal Medicine',
      code: 'GEN',
      description: 'Primary consultations, lifestyle disorders, fevers, and comprehensive health checks.',
      floor: 'Ground Floor',
      roomNumber: '105',
      avgWaitMinutes: 10,
      maxTokensPerDay: 120,
      isActive: true,
    });

    const pediatrics = await Department.create({
      hospitalId: hospital1._id,
      name: 'Pediatrics & Child Care',
      code: 'PED',
      description: 'Child wellness, growth monitoring, immunizations, and pediatric care.',
      floor: '3rd Floor',
      roomNumber: '302',
      avgWaitMinutes: 12,
      maxTokensPerDay: 70,
      isActive: true,
    });

    console.log('Creating Doctors...');
    await Doctor.create([
      {
        hospitalId: hospital1._id,
        departmentId: cardiology._id,
        name: 'Dr. Rajesh Sharma',
        specialization: 'Senior Interventional Cardiologist',
        qualification: 'MBBS, MD, DM (Cardiology)',
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        isAvailable: true,
      },
      {
        hospitalId: hospital1._id,
        departmentId: orthopedics._id,
        name: 'Dr. Priya Mehta',
        specialization: 'Consultant Orthopedic Surgeon',
        qualification: 'MBBS, MS (Orthopedics), MCh',
        availableDays: ['Mon', 'Wed', 'Fri', 'Sat'],
        isAvailable: true,
      },
      {
        hospitalId: hospital1._id,
        departmentId: generalMedicine._id,
        name: 'Dr. Amit Patel',
        specialization: 'Consultant Physician',
        qualification: 'MBBS, MD (Internal Medicine)',
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        isAvailable: true,
      },
      {
        hospitalId: hospital1._id,
        departmentId: pediatrics._id,
        name: 'Dr. Sunita Rao',
        specialization: 'Senior Pediatrician',
        qualification: 'MBBS, DCH, MD (Pediatrics)',
        availableDays: ['Mon', 'Tue', 'Thu', 'Fri'],
        isAvailable: true,
      },
    ]);

    console.log('Creating Seed Users...');
    // 1. Platform Admin
    await User.create({
      name: 'System Administrator',
      email: 'admin@queueless.com',
      password: 'Password123!',
      role: 'admin',
      phone: '+91 99000 00001',
      isVerified: true,
    });

    // 2. Hospital Staff (Doctor / Lead at Apex Cardiology)
    await User.create({
      name: 'Dr. Rajesh Sharma (Staff)',
      email: 'staff@hospital.com',
      password: 'Password123!',
      role: 'staff',
      staffRole: 'doctor',
      hospitalId: hospital1._id,
      departmentId: cardiology._id,
      phone: '+91 99000 00002',
      isVerified: true,
    });

    // 3. Demo Patient
    await User.create({
      name: 'Aarav Kumar',
      email: 'patient@example.com',
      password: 'Password123!',
      role: 'patient',
      phone: '+91 98765 43210',
      isVerified: true,
    });

    console.log('Seeding completed successfully!');
    console.log('----------------------------------------------------');
    console.log('CREDENTIALS:');
    console.log('Platform Admin:  admin@queueless.com   / Password123!');
    console.log('Hospital Staff:  staff@hospital.com   / Password123!');
    console.log('Patient Demo:    patient@example.com  / Password123!');
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed script error:', error);
    process.exit(1);
  }
};

seedData();
