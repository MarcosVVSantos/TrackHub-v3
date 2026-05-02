const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.plan.upsert({
    where: { tier: "free" },
    update: {},
    create: {
      tier: "free",
      maxProjects: 3,
      maxCollaboratorsPerProject: 2,
      maxTracks: 10,
      maxStorageBytes: BigInt(500 * 1024 * 1024), // 500MB
      maxPlaylists: 3,
    },
  });

  await prisma.plan.upsert({
    where: { tier: "premium" },
    update: {},
    create: {
      tier: "premium",
      maxProjects: -1,
      maxCollaboratorsPerProject: -1,
      maxTracks: -1,
      maxStorageBytes: BigInt(-1),
      maxPlaylists: -1,
    },
  });

  console.log("Planos criados: free e premium");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
