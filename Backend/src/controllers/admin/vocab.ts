import type { Request, Response } from "express";
import { VocabService } from "../../services/vocab.service.js";
import { parseIntParam } from "../../utils/params.utils.js";

/**
 * Lấy danh sách bộ từ vựng (Hệ thống & Public của User)
 */
export const getSystemVocabSets = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const includeDeleted = req.query.includeDeleted === "true";

    const sets = await VocabService.getVocabSets({ search, status, includeDeleted });
    
    // Chuẩn hóa dữ liệu trả về cho Admin UI (ownerType, ownerName)
    const data = sets.map(set => {
      // Nếu là bộ của User và đang PUBLIC nhưng status chưa là PUBLISHED, 
      // ta đồng bộ về PUBLISHED để Admin thấy đúng thực tế hiển thị trên Mobile.
      let displayStatus = set.status;
      if (set.owner_user_id && set.visibility === "PUBLIC") {
        displayStatus = "PUBLISHED";
      }

      return {
        ...set,
        status: displayStatus,
        ownerType: set.owner_user_id ? "USER" : "ADMIN",
        ownerName: set.user?.full_name ?? set.admin?.full_name ?? "Hệ thống"
      };
    });

    return res.status(200).json({ message: "Thành công", statusCode: 200, data });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", statusCode: 500 });
  }
};

/**
 * Chi tiết bộ từ vựng
 */
export const getSystemVocabSetDetail = async (req: Request, res: Response) => {
  try {
    const setId = parseIntParam(req.params.setId);
    if (!setId) return res.status(400).json({ message: "ID không hợp lệ" });

    const data = await VocabService.getVocabSetDetail(setId);
    return res.status(200).json({ message: "Thành công", statusCode: 200, data });
  } catch (error: any) {
    return res.status(404).json({ message: error.message, statusCode: 404 });
  }
};

/**
 * Tạo bộ từ vựng mới
 */
export const createSystemVocabSet = async (req: Request, res: Response) => {
  try {
    const { title, description, cards, ownerAdminId } = req.body;
    const set = await VocabService.createVocabSet({ title, description, cards, adminId: ownerAdminId });
    return res.status(201).json({ message: "Tạo thành công", statusCode: 201, data: set });
  } catch (error: any) {
    return res.status(400).json({ message: error.message, statusCode: 400 });
  }
};

/**
 * Import từ Excel
 */
export const importSystemVocabSet = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Thiếu file" });
    const { title, description, ownerAdminId } = req.body;

    const set = await VocabService.importVocabFromExcel(req.file.buffer, { title, description, adminId: ownerAdminId });
    return res.status(201).json({ message: "Import thành công", statusCode: 201, data: set });
  } catch (error: any) {
    return res.status(400).json({ message: error.message, statusCode: 400 });
  }
};

/**
 * Cập nhật trạng thái
 */
export const updateSystemVocabSetStatus = async (req: Request, res: Response) => {
  try {
    const setId = parseIntParam(req.params.setId);
    const { status } = req.body;
    if (!setId) return res.status(400).json({ message: "ID không hợp lệ" });

    const data = await VocabService.updateStatus(setId, status);
    return res.status(200).json({ message: "Cập nhật thành công", statusCode: 200, data });
  } catch (error: any) {
    return res.status(400).json({ message: error.message, statusCode: 400 });
  }
};

/**
 * Cập nhật thông tin bộ từ vựng
 */
export const updateSystemVocabSet = async (req: Request, res: Response) => {
  try {
    const setId = parseIntParam(req.params.setId);
    if (!setId) return res.status(400).json({ message: "ID không hợp lệ" });
    const data = await VocabService.updateVocabSet(setId, req.body);
    return res.status(200).json({ message: "Cập nhật thành công", statusCode: 200, data });
  } catch (error: any) {
    return res.status(400).json({ message: error.message, statusCode: 400 });
  }
};

/**
 * Xóa mềm
 */
export const softDeleteSystemVocabSet = async (req: Request, res: Response) => {
  try {
    const setId = parseIntParam(req.params.setId);
    if (!setId) return res.status(400).json({ message: "ID không hợp lệ" });
    await VocabService.softDelete(setId);
    return res.status(200).json({ message: "Xóa thành công", statusCode: 200 });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", statusCode: 500 });
  }
};

/**
 * Cảnh báo User
 */
export const warnUserVocabSet = async (req: Request, res: Response) => {
  try {
    const setId = parseIntParam(req.params.setId);
    if (!setId) return res.status(400).json({ message: "ID không hợp lệ" });
    await VocabService.warnUserSet(setId);
    return res.status(200).json({ message: "Đã cảnh báo user", statusCode: 200 });
  } catch (error: any) {
    return res.status(400).json({ message: error.message, statusCode: 400 });
  }
};

/**
 * Khôi phục
 */
export const restoreSystemVocabSet = async (req: Request, res: Response) => {
  try {
    const setId = parseIntParam(req.params.setId);
    if (!setId) return res.status(400).json({ message: "ID không hợp lệ" });
    await VocabService.restore(setId);
    return res.status(200).json({ message: "Khôi phục thành công", statusCode: 200 });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", statusCode: 500 });
  }
};
