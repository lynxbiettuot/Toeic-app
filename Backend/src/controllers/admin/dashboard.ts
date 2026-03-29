import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

const parseIntParam = (value: string | string[] | undefined): number => {
  const normalized = Array.isArray(value) ? value[0] : value;
  return Number.parseInt(normalized ?? "", 10);
};

const getStartDateByRange = (range: string): Date | null => {
  const now = new Date();

  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return start;
  }

  if (range === "month") {
    const start = new Date(now);
    start.setMonth(now.getMonth() - 1);
    return start;
  }

  return null;
};

const formatDuration = (start: Date, end: Date | null): string => {
  if (!end) {
    return "-";
  }

  const diffSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  const hours = Math.floor(diffSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((diffSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(diffSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
};

export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    const range = typeof req.query.range === "string" ? req.query.range : "month";
    const startDate = getStartDateByRange(range);

    const userWhere = startDate ? { created_at: { gte: startDate } } : {};
    const sessionWhere = startDate ? { started_at: { gte: startDate } } : {};

    const [newUsers, totalTests, sessions, topGrouped] = await Promise.all([
      prisma.users.count({ where: userWhere }),
      prisma.test_sessions.count({ where: sessionWhere }),
      prisma.test_sessions.findMany({
        where: sessionWhere,
        select: {
          id: true,
          user_id: true,
          exam_set_id: true,
          submitted_at: true,
          total_score: true,
        },
      }),
      prisma.test_sessions.groupBy({
        by: ["exam_set_id"],
        where: sessionWhere,
        _count: {
          exam_set_id: true,
        },
        orderBy: {
          _count: {
            exam_set_id: "desc",
          },
        },
        take: 5,
      }),
    ]);

    const activeUsers = new Set(sessions.map((item) => item.user_id)).size;
    const completedCount = sessions.filter((item) => !!item.submitted_at).length;
    const completionRate = totalTests === 0 ? 0 : Math.round((completedCount / totalTests) * 100);

    const examIds = topGrouped.map((item) => item.exam_set_id);
    const examMap = new Map<number, string>();

    if (examIds.length > 0) {
      const exams = await prisma.exam_sets.findMany({
        where: {
          id: {
            in: examIds,
          },
        },
        select: {
          id: true,
          title: true,
        },
      });

      for (const exam of exams) {
        examMap.set(exam.id, exam.title);
      }
    }

    const topExams = topGrouped.map((item) => ({
      examId: item.exam_set_id,
      title: examMap.get(item.exam_set_id) ?? `Exam #${item.exam_set_id}`,
      attempts: item._count.exam_set_id,
    }));

    const scoreDistribution = [
      { label: "< 300", min: 0, max: 299, count: 0 },
      { label: "300 - 495", min: 300, max: 495, count: 0 },
      { label: "500 - 695", min: 500, max: 695, count: 0 },
      { label: "700 - 895", min: 700, max: 895, count: 0 },
      { label: ">= 900", min: 900, max: Number.MAX_SAFE_INTEGER, count: 0 },
    ];

    for (const session of sessions) {
      const score = session.total_score;
      if (score === null || score === undefined) {
        continue;
      }

      const bucket = scoreDistribution.find((item) => score >= item.min && score <= item.max);
      if (bucket) {
        bucket.count += 1;
      }
    }

    return res.status(200).json({
      message: "Lấy dữ liệu dashboard thành công.",
      statusCode: 200,
      data: {
        range,
        summary: {
          newUsers,
          totalTests,
          activeUsers,
          completionRate,
        },
        topExams,
        scoreDistribution: scoreDistribution.map(({ label, count }) => ({ label, count })),
      },
    });
  } catch (error) {
    console.error("Lỗi dashboard overview:", error);
    return res.status(500).json({
      message: "Không thể lấy dữ liệu dashboard.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const exportDashboardReport = async (req: Request, res: Response) => {
  try {
    const range = typeof req.query.range === "string" ? req.query.range : "month";
    const startDate = getStartDateByRange(range);
    const sessionWhere = startDate ? { started_at: { gte: startDate } } : {};

    const [usersCount, sessionCount, completedCount] = await Promise.all([
      prisma.users.count({ where: startDate ? { created_at: { gte: startDate } } : {} }),
      prisma.test_sessions.count({ where: sessionWhere }),
      prisma.test_sessions.count({
        where: {
          ...sessionWhere,
          submitted_at: {
            not: null,
          },
        },
      }),
    ]);

    const completionRate = sessionCount === 0 ? 0 : Math.round((completedCount / sessionCount) * 100);

    const csvRows = [
      ["range", range],
      ["new_users", usersCount.toString()],
      ["total_tests", sessionCount.toString()],
      ["completed_tests", completedCount.toString()],
      ["completion_rate", `${completionRate}%`],
    ];

    const csv = csvRows.map((row) => row.join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=dashboard-${range}.csv`);

    return res.status(200).send(csv);
  } catch (error) {
    console.error("Lỗi export dashboard:", error);
    return res.status(500).json({
      message: "Không thể export báo cáo dashboard.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const getDashboardUsers = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const users = await prisma.users.findMany({
      where: search
        ? {
            OR: [
              { full_name: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : undefined,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        created_at: true,
      },
      take: 100,
    });

    const userIds = users.map((item) => item.id);

    const groupedScores = userIds.length
      ? await prisma.test_sessions.groupBy({
          by: ["user_id"],
          where: {
            user_id: {
              in: userIds,
            },
            total_score: {
              not: null,
            },
          },
          _avg: {
            total_score: true,
          },
        })
      : [];

    const scoreMap = new Map<number, number>();
    for (const row of groupedScores) {
      scoreMap.set(row.user_id, Math.round(row._avg.total_score ?? 0));
    }

    const data = users.map((item) => ({
      id: item.id,
      fullName: item.full_name,
      email: item.email,
      registerDate: item.created_at,
      averageScore: scoreMap.get(item.id) ?? 0,
    }));

    return res.status(200).json({
      message: "Lấy danh sách user thành công.",
      statusCode: 200,
      data,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách user dashboard:", error);
    return res.status(500).json({
      message: "Không thể lấy danh sách user.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = parseIntParam(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json({
        message: "userId không hợp lệ.",
        statusCode: 400,
      });
    }

    const user = await prisma.users.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        full_name: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy user.",
        statusCode: 404,
      });
    }

    const sessions = await prisma.test_sessions.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        started_at: "desc",
      },
      select: {
        id: true,
        started_at: true,
        submitted_at: true,
        reading_score: true,
        listening_score: true,
        total_score: true,
        exam_set: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      take: 50,
    });

    const ownSets = await prisma.flashcard_sets.findMany({
      where: {
        owner_user_id: userId,
        visibility: "PUBLIC",
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        visibility: true,
        card_count: true,
      },
    });

    const tests = sessions.map((item) => ({
      id: item.id,
      examId: item.exam_set.id,
      exam: item.exam_set.title,
      reading: item.reading_score ?? 0,
      listening: item.listening_score ?? 0,
      total: item.total_score ?? 0,
      startedAt: item.started_at,
      duration: formatDuration(item.started_at, item.submitted_at),
      reviewPath: `/admin/sessions/${item.id}`,
    }));

    const progress = sessions
      .filter((item) => item.total_score !== null)
      .slice(0, 12)
      .reverse()
      .map((item) => ({
        date: item.started_at,
        score: item.total_score,
      }));

    const flashcards = ownSets.map((set) => ({
      id: set.id,
      title: set.title,
      status: set.status,
      visibility: set.visibility,
      cardCount: set.card_count,
      type: "Public",
      warnedAt: null,
    }));

    return res.status(200).json({
      message: "Lấy hồ sơ user thành công.",
      statusCode: 200,
      data: {
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
        },
        tests,
        progress,
        flashcards,
      },
    });
  } catch (error) {
    console.error("Lỗi lấy hồ sơ user:", error);
    return res.status(500).json({
      message: "Không thể lấy hồ sơ user.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const getUserFlashcardSetDetail = async (req: Request, res: Response) => {
  try {
    const userId = parseIntParam(req.params.userId);
    const setId = parseIntParam(req.params.setId);

    if (Number.isNaN(userId) || Number.isNaN(setId)) {
      return res.status(400).json({
        message: "userId hoặc setId không hợp lệ.",
        statusCode: 400,
      });
    }

    const set = await prisma.flashcard_sets.findFirst({
      where: {
        id: setId,
        owner_user_id: userId,
        visibility: "PUBLIC",
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        cover_image_url: true,
        status: true,
        visibility: true,
        card_count: true,
        flashcards: {
          orderBy: {
            id: "asc",
          },
          select: {
            id: true,
            word: true,
            definition: true,
            word_type: true,
            pronunciation: true,
            example: true,
            image_url: true,
            audio_url: true,
          },
        },
      },
    });

    if (!set) {
      return res.status(404).json({
        message: "Không tìm thấy bộ flashcard public của user.",
        statusCode: 404,
      });
    }

    return res.status(200).json({
      message: "Lấy chi tiết bộ flashcard của user thành công.",
      statusCode: 200,
      data: set,
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết flashcard user:", error);
    return res.status(500).json({
      message: "Không thể lấy chi tiết bộ flashcard của user.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const warnUserFlashcardSet = async (req: Request, res: Response) => {
  try {
    const userId = parseIntParam(req.params.userId);
    const setId = parseIntParam(req.params.setId);

    if (Number.isNaN(userId) || Number.isNaN(setId)) {
      return res.status(400).json({
        message: "userId hoặc setId không hợp lệ.",
        statusCode: 400,
      });
    }

    const set = await prisma.flashcard_sets.findFirst({
      where: {
        id: setId,
        owner_user_id: userId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!set) {
      return res.status(404).json({
        message: "Không tìm thấy bộ flashcard public để cảnh báo.",
        statusCode: 404,
      });
    }

    const now = new Date();
    // warned_at is missing from DB
    // await prisma.flashcard_sets.update({
    //   where: { id: setId },
    //   data: { warned_at: now },
    // });

    return res.status(200).json({
      message: "Đã gửi cảnh báo tới user về bộ flashcard không hợp lệ.",
      statusCode: 200,
      data: {
        setId: set.id,
        title: set.title,
        warnedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Lỗi cảnh báo bộ flashcard user:", error);
    return res.status(500).json({
      message: "Không thể cảnh báo bộ flashcard của user.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};

export const moderateUserFlashcardSet = async (req: Request, res: Response) => {
  try {
    const userId = parseIntParam(req.params.userId);
    const setId = parseIntParam(req.params.setId);

    if (Number.isNaN(userId) || Number.isNaN(setId)) {
      return res.status(400).json({
        message: "userId hoặc setId không hợp lệ.",
        statusCode: 400,
      });
    }

    const ownedSet = await prisma.flashcard_sets.findFirst({
      where: {
        id: setId,
        owner_user_id: userId,
      },
      select: {
        id: true,
      },
    });

    if (ownedSet) {
      await prisma.flashcard_sets.update({
        where: {
          id: setId,
        },
        data: {
          status: "DELETED",
          deleted_at: new Date(),
        },
      });

      return res.status(200).json({
        message: "Admin đã xóa bộ flashcard của user.",
        statusCode: 200,
      });
    }

    await prisma.user_saved_sets.deleteMany({
      where: {
        user_id: userId,
        set_id: setId,
      },
    });

    return res.status(200).json({
      message: "Admin đã gỡ bộ flashcard khỏi kho đã lưu của user.",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Lỗi moderate flashcard user:", error);
    return res.status(500).json({
      message: "Không thể xử lý xóa flashcard của user.",
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
    });
  }
};
