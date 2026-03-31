import React, { useEffect, useState } from "react";
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";
import { getProfile, UserProfile } from "../services/userService";

const DEFAULT_AVATAR = "https://w7.pngwing.com/pngs/774/118/png-transparent-green-frog-character-illustration-pepe-the-frog-sweden-4chan-pol-internet-meme-frog-animals-hand-vertebrate.png";

type ProfileScreenProps = {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
  onUpdateUser?: (name: string, avatar: string) => void;
};

export function ProfileScreen({ navigation, onUpdateUser }: ProfileScreenProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const data = await getProfile();
    if (data) {
      setUser(data);
      // Đồng bộ dữ liệu mới nhất về AppEntry và Storage
      if (onUpdateUser) {
        onUpdateUser(data.full_name, data.avatar_url);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
        {/* Header với nút quay lại */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.container}>
        {/* Ảnh đại diện */}
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: user?.avatar_url || DEFAULT_AVATAR }}
            style={styles.avatar}
          />
        </View>

        {/* Thông tin Text */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Feather name="user" size={18} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.label}>Họ và tên</Text>
              <Text style={styles.value}>{user?.full_name || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Feather name="mail" size={18} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email || "N/A"}</Text>
            </View>
          </View>
        </View>

        {/* Nút Chỉnh sửa */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate("EditProfile", { user })}
        >
          <Feather name="edit-2" size={20} color="#ffffff" />
          <Text style={styles.editButtonText}>Chỉnh sửa hồ sơ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111111",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0f0f0",
    borderWidth: 3,
    borderColor: AUTH_ACTION_COLOR,
  },
  infoSection: {
    width: "100%",
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  infoTextContainer: {
    marginLeft: 16,
  },
  label: {
    fontSize: 12,
    color: "#888888",
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    color: "#111111",
    fontWeight: "500",
  },
  editButton: {
    backgroundColor: AUTH_ACTION_COLOR,
    width: "100%",
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  editButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
