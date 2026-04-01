import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";

const ADMIN_ACCOUNTS = [
  {
    email: "admin@gmail.com",
    password: "1234",
    full_name: "Admin mac dinh",
    role: "ADMIN",
  },
  {
    email: "manager@gmail.com",
    password: "1234",
    full_name: "Admin quan ly",
    role: "ADMIN",
  },
];

const run = async () => {
  for (const account of ADMIN_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 12);

    await prisma.admins.upsert({
      where: { email: account.email },
      update: {
        password_hash: passwordHash,
        full_name: account.full_name,
        role: account.role,
        is_active: true,
      },
      create: {
        email: account.email,
        password_hash: passwordHash,
        full_name: account.full_name,
        role: account.role,
        is_active: true,
      },
    });
  }

  const result = await prisma.admins.findMany({
    where: {
      email: {
        in: ADMIN_ACCOUNTS.map((item) => item.email),
      },
    },
    select: {
      email: true,
      full_name: true,
      role: true,
      is_active: true,
    },
    orderBy: {
      email: "asc",
    },
  });

  console.log("Upserted admin accounts:", JSON.stringify(result, null, 2));
};

run()
  .catch((error) => {
    console.error("Upsert admin accounts failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
