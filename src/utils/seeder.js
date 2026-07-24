import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.model.js';
import { Gauge } from '../models/Gauge.model.js';
import { AuditLog } from '../models/AuditLog.model.js';
import { config } from '../config/env.js';

const seedData = async () => {
  try {
    console.log('[GLMS Seeder] Connecting to database...');
    await mongoose.connect(config.mongoUri);
    console.log('[GLMS Seeder] Connection successful. Cleaning existing database...');

    await User.deleteMany({});
    await Gauge.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('[GLMS Seeder] Database cleaned. Creating users...');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('demo123', salt);

    const admin = new User({
      employeeId: 'EMP-1001',
      firstName: 'Aniket',
      lastName: 'Rasal',
      email: 'aniket@company.com',
      passwordHash,
      role: 'quality_admin',
      department: 'Quality',
      badgeQrCode: 'EMP-3023-QR',
      activeGaugeCount: 0,
      isRestricted: false,
      isActive: true
    });

    const prod = new User({
      employeeId: 'EMP-2034',
      firstName: 'Suresh',
      lastName: 'Kumar',
      email: 'prod@company.com',
      passwordHash,
      role: 'production_user',
      department: 'Production',
      badgeQrCode: 'EMP-2034-QR',
      activeGaugeCount: 1,
      isRestricted: false,
      isActive: true
    });

    await admin.save();
    await prod.save();

    console.log('[GLMS Seeder] Users created successfully. Creating gauges...');

    const initialGauges = [
      {
        gaugeId: 'GLMS-PG-2025-00143',
        name: 'Plug Gauge 25mm H7',
        category: 'Plug Gauge',
        make: 'Mitutoyo',
        model: '102-301',
        serialNumber: 'MFR-SN-78901',
        partNumber: 'PG-25-H7',
        range: '25mm H7',
        resolution: '0.001mm',
        accuracy: '0.002mm',
        unit: 'mm',
        purchaseCost: 4200,
        purchaseDate: new Date('2022-01-12'),
        homeLocation: 'Bldg A / Quality Store / C1 / Rack A / S-02 / SL-15',
        currentLocation: 'Bldg A / Quality Store / C1 / Rack A / S-02 / SL-15',
        status: 'Available',
        condition: 'Good',
        calibrationFrequencyDays: 180,
        lastCalibrationDate: new Date('2025-02-15'),
        nextCalibrationDue: new Date('2025-08-15'),
        calibrationStatus: 'Valid',
        qrCode: 'GLMS-PG-2025-00143'
      },
      {
        gaugeId: 'GLMS-VC-2024-00089',
        name: 'Vernier Caliper 150mm',
        category: 'Vernier Caliper',
        make: 'Mitutoyo',
        model: '530-118',
        serialNumber: 'MFR-SN-45612',
        partNumber: 'VC-150-0.02',
        range: '150mm',
        resolution: '0.02mm',
        accuracy: '0.03mm',
        unit: 'mm',
        purchaseCost: 2800,
        purchaseDate: new Date('2024-03-20'),
        homeLocation: 'Bldg A / Quality Store / C1 / Rack B / S-01 / SL-04',
        currentLocation: 'Production / Line 3',
        status: 'Issued',
        condition: 'Good',
        calibrationFrequencyDays: 180,
        lastCalibrationDate: new Date('2025-03-01'),
        nextCalibrationDue: new Date('2025-09-01'),
        calibrationStatus: 'Valid',
        currentHolder: 'Suresh Kumar',
        department: 'Production',
        machine: 'Line-3 / MC-12',
        qrCode: 'GLMS-VC-2024-00089'
      },
      {
        gaugeId: 'GLMS-MC-2023-00021',
        name: 'Outside Micrometer 0-25mm',
        category: 'Micrometer',
        make: 'Starrett',
        model: '436-1',
        serialNumber: 'STR-SN-11204',
        partNumber: 'MC-0-25-0.001',
        range: '0-25mm',
        resolution: '0.001mm',
        accuracy: '0.002mm',
        unit: 'mm',
        purchaseCost: 6500,
        purchaseDate: new Date('2023-06-15'),
        homeLocation: 'Bldg A / Quality Store / C2 / Rack A / S-03 / SL-09',
        currentLocation: 'Process Engineering / CMM-01',
        status: 'Overdue',
        condition: 'Good',
        calibrationFrequencyDays: 180,
        lastCalibrationDate: new Date('2025-01-25'),
        nextCalibrationDue: new Date('2025-07-25'),
        calibrationStatus: 'Due Soon',
        currentHolder: 'Priya Mehta',
        department: 'Process Engineering',
        machine: 'CMM-01',
        qrCode: 'GLMS-MC-2023-00021'
      }
    ];

    for (const g of initialGauges) {
      await new Gauge(g).save();
    }

    console.log('[GLMS Seeder] Gauges created successfully. Creating audit logs...');

    await AuditLog.create({
      action: 'SYSTEM_INITIALIZATION',
      user: 'Super Admin',
      entity: 'SYSTEM',
      details: 'System database successfully initialized and seeded with plant assets.',
      ip: '127.0.0.1'
    });

    console.log('[GLMS Seeder] Seeding completed successfully. Exiting.');
    process.exit(0);
  } catch (error) {
    console.error('[GLMS Seeder] Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
