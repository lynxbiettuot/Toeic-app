import React, { useState } from 'react';
import { AuthScreen } from '../features/auth/screens/AuthScreen';
import { UserHomeScreen } from '../features/user/screens/UserHomeScreen';
import { FlashcardLibraryScreen } from '../features/flashcard/screens/FlashcardLibraryScreen';
import { FlashcardSetDetailScreen } from '../features/flashcard/screens/FlashcardSetDetailScreen';
import { SpacedReviewScreen } from '../features/flashcard/screens/SpacedReviewScreen';
import { DiscoveryScreen } from '../features/flashcard/screens/DiscoveryScreen';
import { PublicSetDetailScreen } from '../features/flashcard/screens/PublicSetDetailScreen';
import type { FlashcardSet, PublicFlashcardSet } from '../features/flashcard/types/flashcard';

export function AppEntry() {
  const [screen, setScreen] = useState<
    'auth' | 'home' | 'flashcard-library' | 'flashcard-detail' | 'spaced-review' | 'discovery' | 'public-detail'
  >('auth');
  const [displayName, setDisplayName] = useState('Linh');
  const [userId, setUserId] = useState(1);
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);
  const [selectedPublicSet, setSelectedPublicSet] = useState<PublicFlashcardSet | null>(null);

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

  if (screen === 'home') {
    return (
      <UserHomeScreen
        displayName={displayName}
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
