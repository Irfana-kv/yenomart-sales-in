const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding tiered pricing rules...");

  // Delete all existing rules
  await prisma.pricingRule.deleteMany();

  const rules = [
    {
      max_price: 100,
      tier1_min_qty: 100,
      tier1_margin: 50,
      tier2_min_qty: 200,
      tier2_margin: 40,
      tier3_min_qty: 300,
      tier3_margin: 25
    },
    {
      max_price: 200,
      tier1_min_qty: 10,
      tier1_margin: 50,
      tier2_min_qty: 100,
      tier2_margin: 40,
      tier3_min_qty: 200,
      tier3_margin: 25
    },
    {
      max_price: 300,
      tier1_min_qty: 2,
      tier1_margin: 50,
      tier2_min_qty: 50,
      tier2_margin: 40,
      tier3_min_qty: 100,
      tier3_margin: 25
    },
    {
      max_price: 500,
      tier1_min_qty: 10,
      tier1_margin: 50,
      tier2_min_qty: 25,
      tier2_margin: 40,
      tier3_min_qty: 50,
      tier3_margin: 25
    },
    {
      max_price: 9999999, // For anything above 500
      tier1_min_qty: 5,
      tier1_margin: 40,
      tier2_min_qty: 10,
      tier2_margin: 30,
      tier3_min_qty: 20,
      tier3_margin: 20
    }
  ];

  for (const rule of rules) {
    await prisma.pricingRule.create({
      data: rule
    });
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
