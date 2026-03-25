import { prisma } from "../lib/prisma.js";

type SeedExam = {
  title: string;
  year: number;
  type: string;
};

type SeedUser = {
  email: string;
  fullName: string;
  createdAt: Date;
};

const EXAMS: SeedExam[] = [
  { title: "TOEIC ETS 2024 - Test 1", year: 2024, type: "TOEIC" },
  { title: "TOEIC ETS 2024 - Test 2", year: 2024, type: "TOEIC" },
  { title: "TOEIC ETS 2023 - Test 5", year: 2023, type: "TOEIC" },
  { title: "TOEIC LC/RC Mixed Practice", year: 2025, type: "TOEIC" },
  { title: "TOEIC Full Test - Mock A", year: 2026, type: "TOEIC" },
];

const now = new Date();
const daysAgo = (n: number): Date => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
};

const USERS: SeedUser[] = [
  { email: "hocvien01@example.com", fullName: "Nguyen Minh Anh", createdAt: daysAgo(2) },
  { email: "hocvien02@example.com", fullName: "Tran Quoc Bao", createdAt: daysAgo(5) },
  { email: "hocvien03@example.com", fullName: "Le Thu Ha", createdAt: daysAgo(8) },
  { email: "hocvien04@example.com", fullName: "Pham Gia Huy", createdAt: daysAgo(12) },
  { email: "hocvien05@example.com", fullName: "Do Khanh Linh", createdAt: daysAgo(15) },
  { email: "hocvien06@example.com", fullName: "Vu Tuan Nam", createdAt: daysAgo(18) },
  { email: "hocvien07@example.com", fullName: "Bui Thanh Phuong", createdAt: daysAgo(22) },
  { email: "hocvien08@example.com", fullName: "Hoang Ngoc Quynh", createdAt: daysAgo(28) },
];

const scorePool = [255, 320, 410, 485, 520, 615, 680, 745, 810, 905];

const ensureExams = async () => {
  const examIds: number[] = [];

  for (const exam of EXAMS) {
    const existing = await prisma.exam_sets.findFirst({
      where: {
        title: exam.title,
        year: exam.year,
      },
      select: { id: true },
    });

    if (existing) {
      examIds.push(existing.id);
      continue;
    }

    const created = await prisma.exam_sets.create({
      data: {
        title: exam.title,
        year: exam.year,
        type: exam.type,
        status: "PUBLISHED",
        created_at: daysAgo(20),
      },
      select: { id: true },
    });

    examIds.push(created.id);
  }

  return examIds;
};

const ensureUsers = async () => {
  const userIds: number[] = [];

  for (const user of USERS) {
    const existing = await prisma.users.findUnique({
      where: { email: user.email },
      select: { id: true },
    });

    if (existing) {
      userIds.push(existing.id);
      continue;
    }

    const created = await prisma.users.create({
      data: {
        email: user.email,
        password_hash: "$2b$10$dashboardseedplaceholderhash0000000000000000000000000",
        full_name: user.fullName,
        created_at: user.createdAt,
      },
      select: { id: true },
    });

    userIds.push(created.id);
  }

  return userIds;
};

const ensureSessions = async (userIds: number[], examIds: number[]) => {
  const existingSeedSessions = await prisma.test_sessions.count({
    where: {
      OR: USERS.map((u) => ({
        user: {
          email: u.email,
        },
      })),
    },
  });

  if (existingSeedSessions >= 24) {
    return;
  }

  let scoreIndex = 0;
  const sessionRows: Array<{
    user_id: number;
    exam_set_id: number;
    started_at: Date;
    submitted_at: Date | null;
    listening_score: number | null;
    reading_score: number | null;
    total_score: number | null;
    status: string;
  }> = [];

  for (let u = 0; u < userIds.length; u += 1) {
    for (let i = 0; i < 3; i += 1) {
      const start = daysAgo(1 + u * 2 + i);
      start.setHours(8 + i * 2, 10, 0, 0);

      const isSubmitted = !(u === 0 && i === 0) && !(u === 3 && i === 2);
      const total = isSubmitted ? scorePool[scoreIndex % scorePool.length] : null;
      scoreIndex += 1;

      const listening = total === null ? null : Math.max(5, Math.round(total * 0.48));
      const reading = total === null ? null : Math.max(5, total - (listening ?? 0));

      const submittedAt = isSubmitted ? new Date(start.getTime() + (40 + i * 7) * 60 * 1000) : null;

      sessionRows.push({
        user_id: userIds[u],
        exam_set_id: examIds[(u + i) % examIds.length],
        started_at: start,
        submitted_at: submittedAt,
        listening_score: listening,
        reading_score: reading,
        total_score: total,
        status: isSubmitted ? "COMPLETED" : "IN_PROGRESS",
      });
    }
  }

  await prisma.test_sessions.createMany({
    data: sessionRows,
  });
};

const ensureUserFlashcards = async (userIds: number[]) => {
  for (let i = 0; i < Math.min(userIds.length, 4); i += 1) {
    const userId = userIds[i];
    const title = `Bo tu ca nhan ${i + 1}`;

    const existing = await prisma.flashcard_sets.findFirst({
      where: {
        owner_user_id: userId,
        title,
      },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    const createdSet = await prisma.flashcard_sets.create({
      data: {
        owner_user_id: userId,
        title,
        description: "Du lieu mau cho dashboard user profile",
        visibility: "PRIVATE",
        is_system: false,
        status: "PUBLISHED",
        card_count: 2,
      },
      select: { id: true },
    });

    await prisma.flashcards.createMany({
      data: [
        {
          set_id: createdSet.id,
          word: `sample-${i + 1}-a`,
          definition: "Nghia mau A",
        },
        {
          set_id: createdSet.id,
          word: `sample-${i + 1}-b`,
          definition: "Nghia mau B",
        },
      ],
    });
  }
};

const main = async () => {
  const examIds = await ensureExams();
  const userIds = await ensureUsers();
  await ensureSessions(userIds, examIds);
  await ensureUserFlashcards(userIds);

  console.log("Seed dashboard data completed.");
  console.log(`Exams: ${examIds.length}, Users: ${userIds.length}`);
};

main()
  .catch((error) => {
    console.error("Seed dashboard data failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
