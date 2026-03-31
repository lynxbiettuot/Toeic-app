import { authFetch } from "../../../shared/api/authFetch";
import { API_BASE_URL } from "../../../config/api";

export type UserProfile = {
    id: number;
    email: string;
    full_name: string;
    avatar_url: string | null;
    created_at: string;
};

/**
 * Lấy thông tin hồ sơ của User hiện tại
 */
export const getProfile = async (): Promise<UserProfile | null> => {
    try {
        const response = await authFetch(`${API_BASE_URL}/auth/profile`);
        const json = await response.json();

        if (json.statusCode === 200) {
            return json.data;
        }
        return null;
    } catch (error) {
        console.error("Failed to get profile:", error);
        return null;
    }
};

/**
 * Cập nhật thông tin hồ sơ (Tên & Avatar)
 */
export const updateProfile = async (data: { full_name?: string; avatar_url?: string }): Promise<boolean> => {
    try {
        const response = await authFetch(`${API_BASE_URL}/auth/profile/update`, {
            method: "PATCH",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json",
            },
        });

        const json = await response.json();
        return json.statusCode === 200;
    } catch (error) {
        console.error("Failed to update profile:", error);
        return false;
    }
};
