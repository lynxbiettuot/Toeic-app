import { prisma } from "../lib/prisma.js";

const PUBLIC_SET_TEMPLATES = [
  {
    title: "User Public - TOEIC Travel",
    description: "Bo tu cong khai ve chu de du lich",
    cards: [
      { word: "itinerary", definition: "Lich trinh chuyen di", word_type: "noun" },
      { word: "boarding pass", definition: "Ve len may bay", word_type: "noun" },
      { word: "departure gate", definition: "Cong khoi hanh", word_type: "noun" },
    ],
  },
  {
    title: "User Public - TOEIC Office",
    description: "Bo tu cong khai ve cong so",
    cards: [
      { word: "deadline", definition: "Han cuoi", word_type: "noun" },
      { word: "minutes", definition: "Bien ban cuoc hop", word_type: "noun" },
      { word: "supervisor", definition: "Nguoi giam sat", word_type: "noun" },
    ],
  },
  {
    title: "User Public - TOEIC Marketing",
    description: "Bo tu cong khai ve marketing",
    cards: [
      { word: "campaign", definition: "Chien dich", word_type: "noun" },
      { word: "promotion", definition: "Khuyen mai", word_type: "noun" },
      { word: "target audience", definition: "Nhom khach hang muc tieu", word_type: "noun" },
    ],
  },
];

const run = async () => {
  const users = await prisma.users.findMany({
    orderBy: {
      created_at: "asc",
    },
    select: {
      id: true,
      full_name: true,
      email: true,
    },
    take: 3,
  });

  if (users.length === 0) {
    console.log("No users found. Please seed users first.");
    return;
  }

  let created = 0;

  for (let i = 0; i < users.length; i += 1) {
    const user = users[i];
    const template = PUBLIC_SET_TEMPLATES[i % PUBLIC_SET_TEMPLATES.length];
    const title = `${template.title} - ${user.full_name}`;

    const existing = await prisma.flashcard_sets.findFirst({
      where: {
        owner_user_id: user.id,
        title,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      continue;
    }

    const createdSet = await prisma.flashcard_sets.create({
      data: {
        owner_user_id: user.id,
        title,
        description: template.description,
        visibility: "PUBLIC",
        is_system: false,
        status: "PUBLISHED",
        card_count: template.cards.length,
      },
      select: {
        id: true,
      },
    });

    await prisma.flashcards.createMany({
      data: template.cards.map((card) => ({
        set_id: createdSet.id,
        word: card.word,
        definition: card.definition,
        word_type: card.word_type,
      })),
    });

    created += 1;
  }

  console.log(`Seeded public user vocab sets: ${created}`);
};

run()
  .catch((error) => {
    console.error("Seed public user vocab sets failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
