import React from "react";
import { Image, Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { AUTH_ACTION_COLOR } from "../../auth/constants/theme";
import { BottomNavbar, NavScreen } from "../../../shared/components/BottomNavbar";

type UserHomeScreenProps = {
  displayName?: string;
  avatarUrl?: string | null;
  onOpenFlashcard?: () => void;
  onOpenVocabularyReview?: () => void;
  onNavigateToExam?: () => void;
  onOpenWrongHistory?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  onNavigate?: (screen: NavScreen) => void;
};

type QuickAction = {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
};

const topActions: QuickAction[] = [
  {
    label: "Listening",
    icon: <Feather name="headphones" size={22} color="#111111" />,
  },
  {
    label: "Reading",
    icon: <Ionicons name="book" size={22} color="#111111" />,
  },
  {
    label: "Writing",
    icon: <MaterialCommunityIcons name="pencil" size={22} color="#111111" />,
  },
  {
    label: "Speaking",
    icon: (
      <MaterialCommunityIcons name="account-voice" size={22} color="#111111" />
    ),
  },
  {
    label: "Flashcard",
    icon: (
      <MaterialCommunityIcons
        name="card-text-outline"
        size={22}
        color="#111111"
      />
    ),
  },
  {
    label: "Ôn từ vựng",
    icon: <Feather name="clock" size={22} color="#111111" />,
  },
  {
    label: "Thi thử",
    icon: <Ionicons name="play" size={22} color="#111111" />,
  },
  {
    label: "Lịch sử & Sai sót",
    icon: <MaterialCommunityIcons name="history" size={22} color="#111111" />,
  },
];

export function UserHomeScreen({
  displayName = '',
  avatarUrl = null,
  onOpenFlashcard,
  onOpenVocabularyReview,
  onNavigateToExam,
  onOpenWrongHistory,
  onOpenProfile,
  onLogout,
  onNavigate,
}: UserHomeScreenProps) {
  const DEFAULT_AVATAR = "https://w7.pngwing.com/pngs/774/118/png-transparent-green-frog-character-illustration-pepe-the-frog-sweden-4chan-pol-internet-meme-frog-animals-hand-vertebrate.png";

  const actions = topActions.map((action) =>
    action.label === 'Flashcard'
      ? {
          ...action,
          onPress: onOpenFlashcard
        }
      : action.label === 'Ôn từ vựng'
        ? {
            ...action,
            onPress: onOpenVocabularyReview
          }
      : action
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Ionicons name="menu" size={28} color="#111111" />
          <TouchableOpacity onPress={onOpenProfile}>
            <Image 
              source={{ uri: avatarUrl || DEFAULT_AVATAR }} 
              style={styles.avatar} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.headerLine} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.greeting}>Hello, {displayName}</Text>

          <View style={styles.grid}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.gridItem}
                onPress={() => {
                  if (action.onPress) {
                    action.onPress();
                  } else if (action.label === "Thi thử") {
                    onNavigateToExam?.();
                  } else if (action.label === "Lịch sử & Sai sót") {
                    onOpenWrongHistory?.();
                  }
                }}
              >
                <View style={styles.iconTile}>{action.icon}</View>
                <Text style={styles.gridLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.chatButton}>
          <MaterialIcons name="chat" size={26} color="#ffffff" />
        </View>

        <BottomNavbar 
          activeScreen="home" 
          onNavigate={onNavigate || (() => {})} 
          onLogout={onLogout || (() => {})} 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AUTH_ACTION_COLOR,
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topBar: {
    height: 58,
    backgroundColor: AUTH_ACTION_COLOR,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#d9d9d9",
  },
  headerLine: {
    height: 1,
    backgroundColor: "#1d1d1d",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 120,
  },
  greeting: {
    alignSelf: "flex-end",
    fontSize: 13,
    color: "#2f2f2f",
    marginBottom: 38,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 28,
  },
  gridItem: {
    width: "22%",
    alignItems: "center",
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#e1e1e1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 11,
    textAlign: "center",
    color: "#111111",
    lineHeight: 14,
  },
  chatButton: {
    position: "absolute",
    right: 16,
    bottom: 86,
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNav: {
    height: 54,
    backgroundColor: AUTH_ACTION_COLOR,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  navButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center'
  },
});
