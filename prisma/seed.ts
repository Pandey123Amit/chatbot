import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@helpdesk.com' },
    update: {},
    create: {
      email: 'admin@helpdesk.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('Created admin:', admin.email);

  // Create Agents
  const agentPassword = await bcrypt.hash('agent123', 10);

  const agent1 = await prisma.user.upsert({
    where: { email: 'agent1@helpdesk.com' },
    update: {},
    create: {
      email: 'agent1@helpdesk.com',
      name: 'John Agent',
      password: agentPassword,
      role: 'AGENT',
      agentStatus: 'ONLINE',
    },
  });
  console.log('Created agent:', agent1.email);

  const agent2 = await prisma.user.upsert({
    where: { email: 'agent2@helpdesk.com' },
    update: {},
    create: {
      email: 'agent2@helpdesk.com',
      name: 'Jane Agent',
      password: agentPassword,
      role: 'AGENT',
      agentStatus: 'OFFLINE',
    },
  });
  console.log('Created agent:', agent2.email);

  // Create Customers
  const customerPassword = await bcrypt.hash('customer123', 10);

  const customer1 = await prisma.user.upsert({
    where: { email: 'customer1@example.com' },
    update: {},
    create: {
      email: 'customer1@example.com',
      name: 'Alice Customer',
      password: customerPassword,
      role: 'CUSTOMER',
    },
  });
  console.log('Created customer:', customer1.email);

  const customer2 = await prisma.user.upsert({
    where: { email: 'customer2@example.com' },
    update: {},
    create: {
      email: 'customer2@example.com',
      name: 'Bob Customer',
      password: customerPassword,
      role: 'CUSTOMER',
    },
  });
  console.log('Created customer:', customer2.email);

  // Create Sample Tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      subject: 'Cannot login to my account',
      description: 'I keep getting an error when trying to login',
      status: 'ASSIGNED',
      priority: 'HIGH',
      channel: 'EMAIL',
      isLocked: true,
      customerId: customer1.id,
      assignedToId: agent1.id,
    },
  });
  console.log('Created ticket:', ticket1.ticketNumber);

  // Add messages to ticket
  await prisma.message.createMany({
    data: [
      {
        ticketId: ticket1.id,
        content: 'Hi, I cannot login to my account. I keep getting an "invalid credentials" error.',
        senderId: customer1.id,
      },
      {
        ticketId: ticket1.id,
        content: 'Hello! I\'m sorry to hear you\'re having trouble. Let me check your account status.',
        senderId: agent1.id,
      },
      {
        ticketId: ticket1.id,
        content: 'Customer has 3 failed login attempts in the last hour.',
        senderId: agent1.id,
        isInternal: true,
      },
    ],
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      subject: 'Feature request: Dark mode',
      description: 'Would love to have a dark mode option',
      status: 'OPEN',
      priority: 'LOW',
      channel: 'CHAT',
      customerId: customer2.id,
    },
  });
  console.log('Created ticket:', ticket2.ticketNumber);

  const ticket3 = await prisma.ticket.create({
    data: {
      subject: 'Payment failed but charged',
      description: 'My payment failed but I was still charged',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      channel: 'EMAIL',
      isLocked: true,
      customerId: customer1.id,
      assignedToId: agent2.id,
    },
  });
  console.log('Created ticket:', ticket3.ticketNumber);

  // Create Website Visitor sentinel user (for anonymous AI chat sessions)
  const visitorPassword = await bcrypt.hash('not-a-real-login', 10);
  const websiteVisitor = await prisma.user.upsert({
    where: { email: 'website-visitor@system.internal' },
    update: {},
    create: {
      email: 'website-visitor@system.internal',
      name: 'Website Visitor',
      password: visitorPassword,
      role: 'CUSTOMER',
    },
  });
  console.log('Created sentinel user:', websiteVisitor.email);

  console.log('Seeding completed!');
  console.log('\nTest Accounts:');
  console.log('Admin: admin@helpdesk.com / admin123');
  console.log('Agent1: agent1@helpdesk.com / agent123');
  console.log('Agent2: agent2@helpdesk.com / agent123');
  console.log('Customer1: customer1@example.com / customer123');
  console.log('Customer2: customer2@example.com / customer123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
