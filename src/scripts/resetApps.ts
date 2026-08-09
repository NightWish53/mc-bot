import { prisma } from '../database/prisma.js';

async function main() {
  await prisma.staffApplication.deleteMany({});
  console.log('All staff applications deleted.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
