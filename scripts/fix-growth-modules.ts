import { PrismaClient } from "@prisma/client";
import { GROWTH_MODULE_IDS } from "../src/lib/platform/modules";

const prisma = new PrismaClient();

async function main() {
  const plan = await prisma.platformPlan.update({
    where: { id: "plan_growth" },
    data: {
      modules: GROWTH_MODULE_IDS,
      description:
        "Full operations with accounts, transport, library, hostel, inventory and staff HR.",
    },
  });
  console.log("updated", plan.id, Array.isArray(plan.modules) ? plan.modules.length : plan.modules);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
