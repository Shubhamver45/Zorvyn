'use strict';

/**
 * Seed script – creates an initial admin, analyst, and viewer account
 * plus some sample financial records.
 *
 * Run with:  node src/prisma/seed.js
 */

const bcrypt = require('bcryptjs');
const prisma  = require('./client');

const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱  Seeding database …');

  // ── Users ──────────────────────────────────────────────────────────────────
  const [admin, analyst, viewer] = await Promise.all([
    prisma.user.upsert({
      where:  { email: 'admin@zorvyn.dev' },
      update: {},
      create: {
        name:     'Alice Admin',
        email:    'admin@zorvyn.dev',
        password: await bcrypt.hash('Admin@1234', SALT_ROUNDS),
        role:     'ADMIN',
        status:   'ACTIVE',
      },
    }),
    prisma.user.upsert({
      where:  { email: 'analyst@zorvyn.dev' },
      update: {},
      create: {
        name:     'Bob Analyst',
        email:    'analyst@zorvyn.dev',
        password: await bcrypt.hash('Analyst@1234', SALT_ROUNDS),
        role:     'ANALYST',
        status:   'ACTIVE',
      },
    }),
    prisma.user.upsert({
      where:  { email: 'viewer@zorvyn.dev' },
      update: {},
      create: {
        name:     'Carol Viewer',
        email:    'viewer@zorvyn.dev',
        password: await bcrypt.hash('Viewer@1234', SALT_ROUNDS),
        role:     'VIEWER',
        status:   'ACTIVE',
      },
    }),
  ]);

  console.log(`   ✔  Users: ${admin.email}, ${analyst.email}, ${viewer.email}`);

  // ── Financial Records ──────────────────────────────────────────────────────
  const now = new Date();

  const records = [
    { amount: 85000, type: 'INCOME',  category: 'Salary',      date: subDays(now, 1),   description: 'Monthly salary – March 2026', createdBy: admin.id },
    { amount: 12000, type: 'INCOME',  category: 'Freelance',   date: subDays(now, 3),   description: 'Freelance project payment',    createdBy: admin.id },
    { amount: 3200,  type: 'EXPENSE', category: 'Rent',        date: subDays(now, 2),   description: 'Monthly rent',                 createdBy: admin.id },
    { amount: 1400,  type: 'EXPENSE', category: 'Utilities',   date: subDays(now, 4),   description: 'Electricity + Internet bill',  createdBy: admin.id },
    { amount: 2500,  type: 'EXPENSE', category: 'Groceries',   date: subDays(now, 5),   description: 'Weekly groceries',             createdBy: analyst.id },
    { amount: 500,   type: 'EXPENSE', category: 'Transport',   date: subDays(now, 5),   description: 'Cab & metro passes',           createdBy: analyst.id },
    { amount: 5000,  type: 'INCOME',  category: 'Investment',  date: subDays(now, 10),  description: 'Dividend received',            createdBy: admin.id },
    { amount: 8900,  type: 'EXPENSE', category: 'Healthcare',  date: subDays(now, 12),  description: 'Annual health check-up',       createdBy: admin.id },
    { amount: 15000, type: 'INCOME',  category: 'Bonus',       date: subDays(now, 15),  description: 'Q1 performance bonus',         createdBy: admin.id },
    { amount: 3000,  type: 'EXPENSE', category: 'Education',   date: subDays(now, 20),  description: 'Online course subscription',   createdBy: analyst.id },
    { amount: 750,   type: 'EXPENSE', category: 'Entertainment',date: subDays(now, 22), description: 'Streaming subscriptions',      createdBy: viewer.id },
    { amount: 40000, type: 'INCOME',  category: 'Salary',      date: subDays(now, 32),  description: 'Monthly salary – Feb 2026',   createdBy: admin.id },
    { amount: 1200,  type: 'EXPENSE', category: 'Groceries',   date: subDays(now, 35),  description: 'Grocery run',                  createdBy: analyst.id },
    { amount: 6000,  type: 'EXPENSE', category: 'Travel',      date: subDays(now, 40),  description: 'Weekend trip – Goa',           createdBy: admin.id },
    { amount: 2000,  type: 'INCOME',  category: 'Freelance',   date: subDays(now, 45),  description: 'Side project payment',         createdBy: analyst.id },
  ];

  for (const record of records) {
    await prisma.financialRecord.create({ data: record });
  }

  console.log(`   ✔  Financial records: ${records.length} entries created`);
  console.log('\n✅  Seed complete!\n');
  console.log('   Default credentials:');
  console.log('   Admin  →  admin@zorvyn.dev   / Admin@1234');
  console.log('   Analyst→  analyst@zorvyn.dev / Analyst@1234');
  console.log('   Viewer →  viewer@zorvyn.dev  / Viewer@1234\n');
}

function subDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
