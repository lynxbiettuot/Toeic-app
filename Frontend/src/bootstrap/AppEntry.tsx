import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthScreen } from '../features/auth/screens/AuthScreen';
import { UserHomeScreen } from '../features/user/screens/UserHomeScreen';
import { ExamListScreen } from '../features/exam/screens/ExamListScreen';
import { ExamIntroScreen } from '../features/exam/screens/ExamIntroScreen';
import { ExamTestScreen } from '../features/exam/screens/ExamTestScreen';
import { ExamResultScreen } from '../features/exam/screens/ExamResultScreen';
import { ExamSessionPartsScreen } from '../features/exam/screens/ExamSessionPartsScreen';
import { ExamSessionPartQuestionsScreen } from '../features/exam/screens/ExamSessionPartQuestionsScreen';
import { ExamQuestionDetailScreen } from '../features/exam/screens/ExamQuestionDetailScreen';
import { WrongAnswerHistoryScreen } from '../features/exam/screens/WrongAnswerHistoryScreen';
import { WrongAnswerListScreen } from '../features/exam/screens/WrongAnswerListScreen';
import { FlashcardLibraryScreen } from '../features/flashcard/screens/FlashcardLibraryScreen';
import { FlashcardSetDetailScreen } from '../features/flashcard/screens/FlashcardSetDetailScreen';
import { SpacedReviewScreen } from '../features/flashcard/screens/SpacedReviewScreen';
import { DiscoveryScreen } from '../features/flashcard/screens/DiscoveryScreen';
import { PublicSetDetailScreen } from '../features/flashcard/screens/PublicSetDetailScreen';
import type { FlashcardSet, PublicFlashcardSet } from '../features/flashcard/types';
import {
  getAccessToken,
  getSavedUserId,
  getSavedDisplayName,
  clearAuthData,
} from '../shared/storage/tokenStorage';

type ScreenState =
  | 'loading'
  | 'auth'
  | 'home'
  | 'exam-list'
  | 'exam-intro'
  | 'exam-test'
  | 'exam-result'
  | 'exam-session-parts'
  | 'exam-session-part-questions'
  | 'exam-question-detail'
  | 'wrong-history'
  | 'wrong-list'
  | 'flashcard-library'
  | 'flashcard-detail'
  | 'spaced-review'
  | 'discovery'
  | 'public-detail';

export function AppEntry() {
  const [screen, setScreen] = useState<ScreenState>('loading');
  const [displayName, setDisplayName] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [flashcardTab, setFlashcardTab] = useState<'my' | 'discover'>('my');
  const [examParams, setExamParams] = useState<any>({});
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);
  const [selectedPublicSet, setSelectedPublicSet] = useState<PublicFlashcardSet | null>(null);
  const [prevScreen, setPrevScreen] = useState<string>('');

  // Restore login state from AsyncStorage on startup
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [token, savedUserId, savedName] = await Promise.all([
          getAccessToken(),
          getSavedUserId(),
          getSavedDisplayName(),
        ]);

        if (token && savedUserId) {
          setUserId(savedUserId);
          setDisplayName(savedName ?? '');
          setScreen('home');
        } else {
          setScreen('auth');
        }
      } catch {
        setScreen('auth');
      }
    };

    restoreSession();
  }, []);

  const handleLogout = async () => {
    await clearAuthData();
    setUserId(null);
    setDisplayName('');
    setScreen('auth');
  };

  const handleNavigate = (navScreen: string) => {
    if (navScreen === 'home') setScreen('home');
    if (navScreen === 'exam-list') setScreen('exam-list');
    if (navScreen === 'spaced-review') setScreen('spaced-review');
    if (navScreen === 'flashcard-library') setScreen('flashcard-library');
    if (navScreen === 'premium') {
      // Placeholder for premium - maybe an alert or a simple screen
      alert("Tính năng Cao cấp đang được phát triển!");
    }
  };

  // Ref luôn cập nhật để tránh stale closure trong navigationShim
  const screenRef = React.useRef(screen);
  const prevScreenRef = React.useRef(prevScreen);
  React.useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  React.useEffect(() => {
    prevScreenRef.current = prevScreen;
  }, [prevScreen]);

  const navigationShim = {
    navigate: (screenName: string, params?: any) => {
      // Always include userId in examParams for consistency across all exam screens
      if (params || screenName.includes('Exam') || screenName.includes('Wrong')) {
        setExamParams((prev: any) => ({ ...prev, ...params, userId }));
      }
      if (screenName === 'ExamIntroScreen') setScreen('exam-intro');
      if (screenName === 'ExamListScreen') setScreen('exam-list');
      if (screenName === 'ExamResultScreen') setScreen('exam-result');
      if (screenName === 'ExamSessionPartsScreen') setScreen('exam-session-parts');
      if (screenName === 'ExamSessionPartQuestionsScreen') setScreen('exam-session-part-questions');
      if (screenName === 'ExamQuestionDetailScreen') {
        setPrevScreen(screenRef.current); // Lưu màn hình trước khi vào chi tiết câu
        setScreen('exam-question-detail');
      }
      if (screenName === 'WrongAnswerListScreen') setScreen('wrong-list');
      if (screenName === 'ExamTestScreen') setScreen('exam-test');
    },
    replace: (screenName: string, params?: any) => {
      // Always include userId in examParams for consistency across all exam screens
      if (params || screenName.includes('Exam') || screenName.includes('Wrong')) {
        setExamParams((prev: any) => ({ ...prev, ...params, userId }));
      }
      if (screenName === 'ExamTestScreen') setScreen('exam-test');
      if (screenName === 'ExamResultScreen') setScreen('exam-result');
      if (screenName === 'ExamSessionPartsScreen') setScreen('exam-session-parts');
      if (screenName === 'ExamSessionPartQuestionsScreen') setScreen('exam-session-part-questions');
      if (screenName === 'ExamQuestionDetailScreen') setScreen('exam-question-detail');
    },
    goBack: () => {
      const cur = screenRef.current;
      const prev = prevScreenRef.current;
      if (cur === 'exam-intro') setScreen('exam-list');
      if (cur === 'exam-test') setScreen('exam-list');
      if (cur === 'exam-result') setScreen('exam-test');
      if (cur === 'exam-session-parts') setScreen('exam-result');
      if (cur === 'exam-session-part-questions') setScreen('exam-session-parts');
      // Khi xem chi tiết câu hỏi: quay về màn hình trước đó
      if (cur === 'exam-question-detail') {
        setScreen(prev === 'wrong-list' ? 'wrong-list' : 'exam-session-part-questions');
      }
      if (cur === 'wrong-list') setScreen('wrong-history');
      if (cur === 'wrong-history') setScreen('home');
    }
  };

  // Loading splash
  if (screen === 'loading') {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#27ae60" />
        </View>
      </SafeAreaProvider>
    );
  }

  let content;

  if (screen === 'public-detail' && selectedPublicSet) {
    content = (
      <PublicSetDetailScreen
        setId={selectedPublicSet.id}
        userId={userId!}
        onBack={() => {
          setFlashcardTab('discover');
          setScreen('flashcard-library');
        }}
        onImportSuccess={() => {
          setFlashcardTab('my');
          setScreen('flashcard-library');
        }}
      />
    );
  } else if (screen === 'discovery') {
    content = (
      <DiscoveryScreen
        userId={userId!}
        onBack={() => setScreen('flashcard-library')}
        onViewDetail={(publicSet) => {
          setSelectedPublicSet(publicSet);
          setScreen('public-detail');
        }}
      />
    );
  } else if (screen === 'flashcard-detail' && selectedSet) {
    content = (
      <FlashcardSetDetailScreen
        userId={userId!}
        flashcardSet={selectedSet}
        onBack={() => setScreen('flashcard-library')}
        onGoHome={() => setScreen('home')}
      />
    );
  } else if (screen === 'flashcard-library') {
    content = (
      <FlashcardLibraryScreen
        userId={userId!}
        defaultTab={flashcardTab}
        onBack={() => setScreen('home')}
        onGoHome={() => setScreen('home')}
        onOpenSet={(setItem) => {
          setSelectedSet(setItem);
          setScreen('flashcard-detail');
        }}
        onOpenPublicSet={(publicSet) => {
          setFlashcardTab('discover');
          setSelectedPublicSet(publicSet);
          setScreen('public-detail');
        }}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    );
  } else if (screen === 'spaced-review') {
    content = (
      <SpacedReviewScreen 
        userId={userId!} 
        onBackHome={() => setScreen('home')} 
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    );
  } else if (screen === 'exam-result') {
    content = <ExamResultScreen navigation={navigationShim} route={{ params: examParams }} />;
  } else if (screen === 'exam-session-parts') {
    content = <ExamSessionPartsScreen navigation={navigationShim} route={{ params: examParams }} />;
  } else if (screen === 'exam-session-part-questions') {
    content = <ExamSessionPartQuestionsScreen navigation={navigationShim} route={{ params: examParams }} />;
  } else if (screen === 'exam-question-detail') {
    content = <ExamQuestionDetailScreen navigation={navigationShim} route={{ params: examParams }} />;
  } else if (screen === 'exam-test') {
    content = <ExamTestScreen navigation={navigationShim} route={{ params: examParams }} />;
  } else if (screen === 'exam-intro') {
    content = <ExamIntroScreen navigation={navigationShim} route={{ params: examParams }} />;
  } else if (screen === 'wrong-history') {
    content = (
      <WrongAnswerHistoryScreen
        navigation={navigationShim}
        route={{ params: examParams }}
        onBack={() => setScreen('home')}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    );
  } else if (screen === 'wrong-list') {
    content = <WrongAnswerListScreen navigation={navigationShim} route={{ params: examParams }} />;
  } else if (screen === 'exam-list') {
    content = (
      <ExamListScreen
        navigation={navigationShim}
        route={{ params: { ...examParams, userId } }}
        onBack={() => setScreen('home')}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    );
  } else if (screen === 'home') {
    content = (
      <UserHomeScreen
        displayName={displayName}
        onNavigateToExam={() => setScreen('exam-list')}
        onOpenFlashcard={() => {
          setFlashcardTab('my');
          setScreen('flashcard-library');
        }}
        onOpenVocabularyReview={() => setScreen('spaced-review')}
        onOpenWrongHistory={() => setScreen('wrong-history')}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    );
  } else {
    content = (
      <AuthScreen
        onLoginSuccess={(payload) => {
          if (payload?.displayName) {
            setDisplayName(payload.displayName);
          }

          if (payload?.userId) {
            setUserId(payload.userId);
          }

          setScreen('home');
        }}
      />
    );
  }

  return (
    <SafeAreaProvider>
      {content}
    </SafeAreaProvider>
  );
}
