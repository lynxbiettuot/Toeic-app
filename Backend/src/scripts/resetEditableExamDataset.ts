import { prisma } from "../lib/prisma.js";

type SeedQuestion = {
  part_number: number;
  question_number: number;
  content: string;
  correct_answer: "A" | "B" | "C" | "D";
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
};

type SeedExam = {
  title: string;
  year: number;
  type: string;
  duration_minutes: number;
  status: "HIDDEN" | "PUBLISHED";
  questions: SeedQuestion[];
};

const EXAM_SEEDS: SeedExam[] = [
  {
    title: "TOEIC Editable Sample 1",
    year: 2026,
    type: "FULL_TEST",
    duration_minutes: 120,
    status: "HIDDEN",
    questions: [
      {
        part_number: 1,
        question_number: 1,
        content: "Look at the picture. What is the man doing?",
        correct_answer: "B",
        options: {
          A: "He is washing a car.",
          B: "He is typing on a laptop.",
          C: "He is painting a wall.",
          D: "He is carrying a ladder.",
        },
      },
      {
        part_number: 2,
        question_number: 2,
        content: "When will the report be ready?",
        correct_answer: "C",
        options: {
          A: "At the front desk.",
          B: "By Mr. Tanaka.",
          C: "By this afternoon.",
          D: "About the sales team.",
        },
      },
      {
        part_number: 5,
        question_number: 3,
        content: "All employees must ____ their ID badges at all times.",
        correct_answer: "A",
        options: {
          A: "wear",
          B: "wore",
          C: "wearing",
          D: "to wear",
        },
      },
    ],
  },
  {
    title: "TOEIC Editable Sample 2",
    year: 2024,
    type: "FULL_TEST",
    duration_minutes: 120,
    status: "PUBLISHED",
    questions: [
      {
        part_number: 1,
        question_number: 1,
        content: "Look at the picture. What is on the table?",
        correct_answer: "D",
        options: {
          A: "A suitcase",
          B: "A helmet",
          C: "A projector",
          D: "Several documents",
        },
      },
      {
        part_number: 2,
        question_number: 2,
        content: "Who approved the budget revision?",
        correct_answer: "A",
        options: {
          A: "The finance director.",
          B: "At headquarters.",
          C: "Next quarter.",
          D: "For marketing.",
        },
      },
      {
        part_number: 6,
        question_number: 3,
        content: "Please submit your expense form ____ Friday.",
        correct_answer: "C",
        options: {
          A: "since",
          B: "during",
          C: "by",
          D: "among",
        },
      },
    ],
  },
  {
    title: "TOEIC Editable Sample 3",
    year: 2023,
    type: "FULL_TEST",
    duration_minutes: 120,
    status: "HIDDEN",
    questions: [
      {
        part_number: 1,
        question_number: 1,
        content: "Look at the picture. Where are the people standing?",
        correct_answer: "C",
        options: {
          A: "In a warehouse",
          B: "On a rooftop",
          C: "At a train platform",
          D: "Inside a factory",
        },
      },
      {
        part_number: 2,
        question_number: 2,
        content: "Could you send me the final draft today?",
        correct_answer: "B",
        options: {
          A: "It was sent yesterday.",
          B: "Sure, I will email it shortly.",
          C: "The printer is on the desk.",
          D: "Yes, the draft is blue.",
        },
      },
      {
        part_number: 5,
        question_number: 3,
        content: "The conference room is being ____ for tomorrow's event.",
        correct_answer: "D",
        options: {
          A: "prepare",
          B: "prepares",
          C: "preparedly",
          D: "prepared",
        },
      },
    ],
  },
];

const run = async () => {
  await prisma.$transaction(async (tx) => {
    await tx.user_answers.deleteMany({});
    await tx.session_part_scores.deleteMany({});
    await tx.answer_options.deleteMany({});
    await tx.questions.deleteMany({});
    await tx.question_groups.deleteMany({});
    await tx.test_sessions.deleteMany({});
    await tx.exam_sets.deleteMany({});

    for (const exam of EXAM_SEEDS) {
      const createdExam = await tx.exam_sets.create({
        data: {
          title: exam.title,
          year: exam.year,
          type: exam.type,
          duration_minutes: exam.duration_minutes,
          total_questions: exam.questions.length,
          status: exam.status,
          created_by: null,
          deleted_at: null,
        },
        select: { id: true },
      });

      for (const question of exam.questions) {
        const createdQuestion = await tx.questions.create({
          data: {
            exam_set_id: createdExam.id,
            part_number: question.part_number,
            question_number: question.question_number,
            content: question.content,
            correct_answer: question.correct_answer,
            explanation: null,
            group_id: null,
          },
          select: { id: true },
        });

        await tx.answer_options.createMany({
          data: [
            { question_id: createdQuestion.id, option_label: "A", content: question.options.A },
            { question_id: createdQuestion.id, option_label: "B", content: question.options.B },
            { question_id: createdQuestion.id, option_label: "C", content: question.options.C },
            { question_id: createdQuestion.id, option_label: "D", content: question.options.D },
          ],
        });
      }
    }
  });

  console.log(
    `Reset editable exam dataset done. Created ${EXAM_SEEDS.length} exam sets with ${EXAM_SEEDS.reduce((sum, item) => sum + item.questions.length, 0)} questions.`
  );
};

run()
  .catch((error) => {
    console.error("Reset editable exam dataset failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
