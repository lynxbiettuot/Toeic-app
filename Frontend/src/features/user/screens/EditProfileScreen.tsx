import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";
import { updateProfile } from "../services/userService";
import { uploadToCloudinary } from "../../../shared/services/cloudinaryService";

const DEFAULT_AVATAR = "https://w7.pngwing.com/pngs/774/118/png-transparent-green-frog-character-illustration-pepe-the-frog-sweden-4chan-pol-internet-meme-frog-animals-hand-vertebrate.png";

export function EditProfileScreen({ route, navigation, onUpdateUser }: any) {
  const { user } = route.params;
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || DEFAULT_AVATAR);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    // Yêu cầu quyền truy cập thư viện ảnh
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert("Lỗi", "Bạn cần cấp quyền truy cập thư viện ảnh để đổi avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      handleUpload(result.assets[0].uri);
    }
  };

  const handleUpload = async (uri: string) => {
    setUploading(true);
    const uploadedUrl = await uploadToCloudinary(uri);
    setUploading(false);

    if (uploadedUrl) {
      setAvatarUrl(uploadedUrl);
    } else {
      Alert.alert("Lỗi", "Không thể tải ảnh lên Cloudinary. Vui lòng thử lại.");
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập họ và tên.");
      return;
    }

    setLoading(true);
    const success = await updateProfile({
      full_name: fullName,
      avatar_url: avatarUrl,
    });
    setLoading(false);

    if (success) {
      if (onUpdateUser) {
        onUpdateUser(fullName, avatarUrl);
      }
      Alert.alert("Thành công", "Hồ sơ đã được cập nhật.", [
        { text: "OK", onPress: () => navigation.navigate("Profile") }
      ]);
    } else {
      Alert.alert("Lỗi", "Cập nhật hồ sơ thất bại.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color="#111111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading || uploading}>
          {loading ? (
            <ActivityIndicator size="small" color={AUTH_ACTION_COLOR} />
          ) : (
            <Text style={[styles.saveText, (loading || uploading) && { opacity: 0.5 }]}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* Chỉnh sửa ảnh đại diện */}
        <TouchableOpacity style={styles.avatarPicker} onPress={pickImage} disabled={uploading}>
          <Image source={{ uri: avatarUrl || DEFAULT_AVATAR }} style={styles.avatar} />
          <View style={styles.cameraIcon}>
            {uploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Feather name="camera" size={16} color="#ffffff" />
            )}
          </View>
        </TouchableOpacity>

        {/* Form nhập liệu */}
        <View style={styles.form}>
          <Text style={styles.inputLabel}>Họ và tên</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Nhập họ và tên"
            />
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.inputLabel}>Email (Không thể thay đổi)</Text>
          <View style={[styles.inputContainer, styles.disabledInput]}>
            <TextInput
              style={[styles.input, { color: '#999' }]}
              value={user?.email || ""}
              editable={false}
            />
          </View>
        </View>

        <Text style={styles.note}>Lưu ý: Bạn chỉ có thể thay đổi tên hiển thị và ảnh đại diện.</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  saveText: {
    fontSize: 16,
    fontWeight: "600",
    color: AUTH_ACTION_COLOR,
  },
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  avatarPicker: {
    marginBottom: 40,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: AUTH_ACTION_COLOR,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  form: {
    width: "100%",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    justifyContent: "center",
  },
  disabledInput: {
    backgroundColor: "#eeeeee",
    opacity: 0.8,
  },
  input: {
    fontSize: 16,
    color: "#111111",
  },
  note: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 20,
  },
});
