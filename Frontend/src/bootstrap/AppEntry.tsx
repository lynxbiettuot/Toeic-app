import React, { useState } from 'react';
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

type ScreenState = 
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
  const [screen, setScreen] = useState<ScreenState>('auth');
  const [displayName, setDisplayName] = useState('Linh');
  const [userId, setUserId] = useState(1);
  const [flashcardTab, setFlashcardTab] = useState<'my' | 'discover'>('my');
  const [examParams, setExamParams] = useState<any>({});
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);
  const [selectedPublicSet, setSelectedPublicSet] = useState<PublicFlashcardSet | null>(null);
  const [prevScreen, setPrevScreen] = useState<string>('');

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
        setExamParams((prev) => ({ ...prev, ...params, userId }));
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
        setExamParams((prev) => ({ ...prev, ...params, userId }));
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

  if (screen === 'public-detail' && selectedPublicSet) {
    return (
      <PublicSetDetailScreen
        setId={selectedPublicSet.id}
        userId={userId}
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
  }

  if (screen === 'discovery') {
    return (
      <DiscoveryScreen
        userId={userId}
        onBack={() => setScreen('flashcard-library')}
        onViewDetail={(publicSet) => {
          setSelectedPublicSet(publicSet);
          setScreen('public-detail');
        }}
      />
    );
  }

  if (screen === 'flashcard-detail' && selectedSet) {
    return (
      <FlashcardSetDetailScreen
        userId={userId}
        flashcardSet={selectedSet}
        onBack={() => setScreen('flashcard-library')}
        onGoHome={() => setScreen('home')}
      />
    );
  }

  if (screen === 'flashcard-library') {
    return (
      <FlashcardLibraryScreen
        userId={userId}
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
      />
    );
  }

  if (screen === 'spaced-review') {
    return <SpacedReviewScreen userId={userId} onBackHome={() => setScreen('home')} />;
  }

  if (screen === 'exam-result') {
    return <ExamResultScreen navigation={navigationShim} route={{ params: examParams }} />;
  }

  if (screen === 'exam-session-parts') {
    return <ExamSessionPartsScreen navigation={navigationShim} route={{ params: examParams }} />;
  }

  if (screen === 'exam-session-part-questions') {
    return <ExamSessionPartQuestionsScreen navigation={navigationShim} route={{ params: examParams }} />;
  }

  if (screen === 'exam-question-detail') {
    return <ExamQuestionDetailScreen navigation={navigationShim} route={{ params: examParams }} />;
  }

  if (screen === 'exam-test') {
    return <ExamTestScreen navigation={navigationShim} route={{ params: examParams }} />;
  }

  if (screen === 'exam-intro') {
    return <ExamIntroScreen navigation={navigationShim} route={{ params: examParams }} />;
  }

  if (screen === 'wrong-history') {
    return (
      <WrongAnswerHistoryScreen
        navigation={navigationShim}
        route={{ params: examParams }}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'wrong-list') {
    return <WrongAnswerListScreen navigation={navigationShim} route={{ params: examParams }} />;
  }

  if (screen === 'exam-list') {
    return (
      <ExamListScreen
        navigation={navigationShim}
        route={{ params: examParams }}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'home') {
    return (
      <UserHomeScreen
        displayName={displayName}
        onNavigateToExam={() => setScreen('exam-list')}
        onOpenFlashcard={() => {
          setFlashcardTab('my');
          setScreen('flashcard-library');
        }}
        onOpenVocabularyReview={() => setScreen('spaced-review')}
        onOpenWrongHistory={() => setScreen('wrong-history')}
      />
    );
  }

  return (
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


