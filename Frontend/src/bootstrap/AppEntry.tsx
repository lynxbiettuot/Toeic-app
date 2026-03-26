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
import { FlashcardLibraryScreen } from '../features/flashcard/screens/FlashcardLibraryScreen';
import { FlashcardSetDetailScreen } from '../features/flashcard/screens/FlashcardSetDetailScreen';
import { SpacedReviewScreen } from '../features/flashcard/screens/SpacedReviewScreen';
import { DiscoveryScreen } from '../features/flashcard/screens/DiscoveryScreen';
import { PublicSetDetailScreen } from '../features/flashcard/screens/PublicSetDetailScreen';
import type { FlashcardSet, PublicFlashcardSet } from '../features/flashcard/types/flashcard';

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
  | 'flashcard-library'
  | 'flashcard-detail'
  | 'spaced-review'
  | 'discovery'
  | 'public-detail';

export function AppEntry() {
  const [screen, setScreen] = useState<ScreenState>('auth');
  const [displayName, setDisplayName] = useState('Linh');
  const [userId, setUserId] = useState(1);
  const [examParams, setExamParams] = useState<any>({});
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);
  const [selectedPublicSet, setSelectedPublicSet] = useState<PublicFlashcardSet | null>(null);

  const navigationShim = {
    navigate: (screenName: string, params?: any) => {
      if (params) setExamParams((prev) => ({ ...prev, ...params }));
      if (screenName === 'ExamIntroScreen') setScreen('exam-intro');
      if (screenName === 'ExamListScreen') setScreen('exam-list');
      if (screenName === 'ExamResultScreen') setScreen('exam-result');
      if (screenName === 'ExamSessionPartsScreen') setScreen('exam-session-parts');
      if (screenName === 'ExamSessionPartQuestionsScreen') setScreen('exam-session-part-questions');
      if (screenName === 'ExamQuestionDetailScreen') setScreen('exam-question-detail');
    },
    replace: (screenName: string, params?: any) => {
      if (params) setExamParams((prev) => ({ ...prev, ...params }));
      if (screenName === 'ExamTestScreen') setScreen('exam-test');
      if (screenName === 'ExamResultScreen') setScreen('exam-result');
      if (screenName === 'ExamSessionPartsScreen') setScreen('exam-session-parts');
      if (screenName === 'ExamSessionPartQuestionsScreen') setScreen('exam-session-part-questions');
      if (screenName === 'ExamQuestionDetailScreen') setScreen('exam-question-detail');
    },
    goBack: () => {
      if (screen === 'exam-intro') setScreen('exam-list');
      if (screen === 'exam-test') setScreen('exam-list');
      if (screen === 'exam-result') setScreen('exam-test');
      if (screen === 'exam-session-parts') setScreen('exam-result');
      if (screen === 'exam-session-part-questions') setScreen('exam-session-parts');
      if (screen === 'exam-question-detail') setScreen('exam-session-part-questions');
    }
  };

  if (screen === 'public-detail' && selectedPublicSet) {
    return (
      <PublicSetDetailScreen
        setId={selectedPublicSet.id}
        userId={userId}
        onBack={() => setScreen('discovery')}
        onImportSuccess={() => {
          setScreen('flashcard-library');
        }}
      />
    );
  }

  if (screen === 'discovery') {
    return (
      <DiscoveryScreen
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
        onBack={() => setScreen('home')}
        onGoHome={() => setScreen('home')}
        onOpenSet={(setItem) => {
          setSelectedSet(setItem);
          setScreen('flashcard-detail');
        }}
        onOpenDiscovery={() => setScreen('discovery')}
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

  if (screen === 'exam-list') {
    return <ExamListScreen navigation={navigationShim} onBack={() => setScreen('home')} />;
  }

  if (screen === 'home') {
    return (
      <UserHomeScreen
        displayName={displayName}
        onNavigateToExam={() => setScreen('exam-list')}
        onOpenFlashcard={() => setScreen('flashcard-library')}
        onOpenVocabularyReview={() => setScreen('spaced-review')}
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


