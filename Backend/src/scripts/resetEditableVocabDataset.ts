import { prisma } from "../lib/prisma.js";

type SeedSet = {
  title: string;
  description: string;
  status: "HIDDEN" | "PUBLISHED";
  cards: Array<{
    word: string;
    definition: string;
    word_type?: string;
    pronunciation?: string;
    example?: string;
    image_url?: string;
  }>;
};

const SYSTEM_VOCAB_SETS: SeedSet[] = [
  {
    title: "TOEIC Office Essentials",
    description: "Bo tu he thong de luyen tap ngu canh cong so",
    status: "HIDDEN",
    cards: [
      {
        word: "agenda",
        definition: "Chuong trinh hop",
        word_type: "noun",
        example: "Please review the agenda before the meeting.",
      },
      {
        word: "conference room",
        definition: "Phong hop",
        word_type: "noun",
        example: "The conference room is on the third floor.",
      },
      {
        word: "schedule",
        definition: "Lich trinh",
        word_type: "noun",
        example: "Her schedule is full this week.",
      },
    ],
  },
  {
    title: "TOEIC Travel Basics",
    description: "Bo tu he thong ve du lich va san bay",
    status: "PUBLISHED",
    cards: [
      {
        word: "itinerary",
        definition: "Lich trinh chuyen di",
        word_type: "noun",
        example: "Our itinerary includes two cities.",
      },
      {
        word: "boarding pass",
        definition: "The len may bay",
        word_type: "noun",
        example: "Keep your boarding pass ready.",
      },
      {
        word: "departure gate",
        definition: "Cong khoi hanh",
        word_type: "noun",
        example: "The departure gate changed to B12.",
      },
    ],
  },
  {
    title: "TOEIC Marketing Terms",
    description: "Bo tu he thong cho chu de marketing",
    status: "HIDDEN",
    cards: [
      {
        word: "campaign",
        definition: "Chien dich",
        word_type: "noun",
        example: "The campaign starts next Monday.",
      },
      {
        word: "target audience",
        definition: "Nhom khach hang muc tieu",
        word_type: "noun",
        example: "Define your target audience clearly.",
      },
      {
        word: "promotion",
        definition: "Khuyen mai",
        word_type: "noun",
        example: "This promotion runs for two weeks.",
      },
    ],
  },
];

const run = async () => {
  // Convert old user-public sample sets to editable system sets instead of deleting (avoid FK issues).
  const oldUserPublicSets = await prisma.flashcard_sets.findMany({
    where: {
      title: {
        startsWith: "User Public - TOEIC",
      },
      owner_user_id: {
        not: null,
      },
    },
    select: { id: true },
  });

  for (const set of oldUserPublicSets) {
    await prisma.flashcard_sets.update({
      where: { id: set.id },
      data: {
        owner_user_id: null,
        owner_admin_id: null,
        is_system: true,
        status: "HIDDEN",
        warned_at: null,
        deleted_at: null,
      },
    });
  }

  for (const set of SYSTEM_VOCAB_SETS) {
    const existingSet = await prisma.flashcard_sets.findFirst({
      where: {
        title: set.title,
      },
      select: { id: true },
    });

    const targetSet = existingSet
      ? await prisma.flashcard_sets.update({
          where: { id: existingSet.id },
          data: {
            description: set.description,
            status: set.status,
            visibility: "PUBLIC",
            is_system: true,
            owner_user_id: null,
            owner_admin_id: null,
            warned_at: null,
            deleted_at: null,
            card_count: set.cards.length,
          },
          select: { id: true },
        })
      : await prisma.flashcard_sets.create({
          data: {
            title: set.title,
            description: set.description,
            status: set.status,
            visibility: "PUBLIC",
            is_system: true,
            card_count: set.cards.length,
          },
          select: { id: true },
        });

    await prisma.flashcards.deleteMany({
      where: {
        set_id: targetSet.id,
      },
    });

    await prisma.flashcards.createMany({
      data: set.cards.map((card) => ({
        set_id: targetSet.id,
        word: card.word,
        definition: card.definition,
        word_type: card.word_type ?? null,
        pronunciation: card.pronunciation ?? null,
        example: card.example ?? null,
        image_url: card.image_url ?? null,
      })),
    });
  }

  console.log(
    `Reset editable vocab dataset done. Updated ${oldUserPublicSets.length} old sets and prepared ${SYSTEM_VOCAB_SETS.length} system sets.`
  );
};

run()
  .catch((error) => {
    console.error("Reset editable vocab dataset failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
