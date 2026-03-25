import React, { useState } from "react";
import { AuthScreen } from "../features/auth/screens/AuthScreen";
import { UserHomeScreen } from "../features/user/screens/UserHomeScreen";
import { ExamListScreen } from "../features/exam/screens/ExamListScreen";
import { ExamIntroScreen } from "../features/exam/screens/ExamIntroScreen";
import { ExamTestScreen } from "../features/exam/screens/ExamTestScreen";
import { ExamResultScreen } from "../features/exam/screens/ExamResultScreen";

export function AppEntry() {
  const [screen, setScreen] = useState<"auth" | "home" | "exam-list" | "exam-intro" | "exam-test" | "exam-result">("auth");
  const [displayName, setDisplayName] = useState("Linh");
  const [examParams, setExamParams] = useState<any>({});

  const navigationShim = {
    navigate: (screenName: string, params?: any) => {
      if (params) setExamParams(params);
      if (screenName === 'ExamIntroScreen') setScreen('exam-intro');
      if (screenName === 'ExamListScreen') setScreen('exam-list');
      if (screenName === 'ExamResultScreen') setScreen('exam-result');
    },
    replace: (screenName: string, params?: any) => {
      if (params) setExamParams(params);
      if (screenName === 'ExamTestScreen') setScreen('exam-test');
      if (screenName === 'ExamResultScreen') setScreen('exam-result');
    },
    goBack: () => {
      if (screen === 'exam-intro') setScreen('exam-list');
      if (screen === 'exam-test') setScreen('exam-list');
    }
  };

  if (screen === "exam-result") {
    return <ExamResultScreen navigation={navigationShim} route={{ params: examParams }} />;
  }

  if (screen === "exam-test") {
    return <ExamTestScreen navigation={navigationShim} route={{ params: examParams }} />;
  }

  if (screen === "exam-intro") {
    return <ExamIntroScreen navigation={navigationShim} route={{ params: examParams }} />;
  }

  if (screen === "exam-list") {
    return <ExamListScreen navigation={navigationShim} onBack={() => setScreen("home")} />;
  }
  if (screen === "home") {
    return (
      <UserHomeScreen
        displayName={displayName}
        onNavigateToExam={() => setScreen("exam-list")}
      />
    );
  }

  return (
    <AuthScreen
      onLoginSuccess={(name) => {
        if (name) {
          setDisplayName(name);
        }
        setScreen("home");
      }}
    />
  );
}
