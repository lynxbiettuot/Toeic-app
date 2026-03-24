import React, { useState } from 'react';
import { AuthScreen } from '../features/auth/screens/AuthScreen';
import { UserHomeScreen } from '../features/user/screens/UserHomeScreen';

export function AppEntry() {
  const [screen, setScreen] = useState<'auth' | 'home'>('auth');
  const [displayName, setDisplayName] = useState('Linh');

  if (screen === 'home') {
    return <UserHomeScreen displayName={displayName} />;
  }

  return (
    <AuthScreen
      onLoginSuccess={(name) => {
        if (name) {
          setDisplayName(name);
        }
        setScreen('home');
      }}
    />
  );
}
