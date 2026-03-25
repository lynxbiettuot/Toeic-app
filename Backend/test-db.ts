import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const exams = await prisma.exam_sets.findMany({
    select: { id: true, title: true }
  });
  console.log("Exams:", exams);

  if (exams.length > 0) {
    for (const exam of exams) {
      const qCount = await prisma.questions.count({
        where: { exam_set_id: exam.id }
      });
      console.log(`Exam ${exam.id} (${exam.title}) has ${qCount} questions.`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
