import { prisma } from "../lib/prisma.js";

const run = async () => {
  const sets = await prisma.flashcard_sets.findMany({
    where: {
      owner_user_id: {
        not: null,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      visibility: true,
      warned_at: true,
    },
  });

  let updatedCount = 0;

  for (const set of sets) {
    const isWarned = !!set.warned_at;
    const visibility = isWarned ? "PRIVATE" : set.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE";
    const status = visibility === "PUBLIC" ? "PUBLISHED" : "HIDDEN";

    await prisma.flashcard_sets.update({
      where: { id: set.id },
      data: {
        visibility,
        status,
      },
    });

    updatedCount += 1;
  }

  console.log(`Synced user flashcard sets: ${updatedCount}`);
};

run()
  .catch((error) => {
    console.error("Sync user flashcard visibility/status failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
