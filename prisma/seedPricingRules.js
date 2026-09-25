const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding pricing rules...');

  const rules = [
    { max_price: 500, margin: 50, min_order: 10 },
    { max_price: 1000, margin: 40, min_order: 5 },
    { max_price: 5000, margin: 30, min_order: 2 },
    { max_price: 10000, margin: 25, min_order: 1 },
    { max_price: 9999999, margin: 20, min_order: 1 },
  ];

  for (const rule of rules) {
    await prisma.pricingRule.create({
      data: rule,
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
