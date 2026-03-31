export function getPageTitle(pathname) {
  if (pathname === "/admin/dashboard") {
    return "Admin - Dashboard";
  }

  if (pathname === "/admin/users") {
    return "Admin - Quản lý người dùng";
  }

  if (pathname === "/admin/exams/import-excel") {
    return "Admin - Import đề thi";
  }

  if (pathname === "/admin/exams/new") {
    return "Admin - Tạo đề thi";
  }

  if (/^\/admin\/exams\/\d+$/.test(pathname)) {
    return "Admin - Chi tiết đề";
  }

  if (pathname.startsWith("/admin/vocab")) {
    return "Admin - Quản lý Từ vựng";
  }

  return "Admin - Quản lý đề thi";
}

export function normalizeStatusLabel(status) {
  if (status === "DRAFT") {
    return "Nháp";
  }

  if (status === "PUBLISHED") {
    return "Công khai";
  }

  if (status === "HIDDEN") {
    return "Tạm ẩn";
  }

  if (status === "DELETED") {
    return "Đã xóa";
  }

  return status || "-";
}

export function splitPipeSeparatedUrls(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isHttpUrl(value) {
  if (!value) {
    return false;
  }
  return /^https?:\/\//i.test(value.trim());
}
