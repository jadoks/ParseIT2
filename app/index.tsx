import React from 'react';
import HomeScreen from '../App';

// Previously this screen force-showed a splash graphic for a flat 3 seconds
// before mounting the real app, via setTimeout(..., 3000). That delayed the
// Largest Contentful Paint by a fixed 3s on every load, regardless of how
// fast auth/data actually resolved.
//
// App.tsx already has its own isCheckingAuth loading state (spinner) that
// covers the brief moment before a cached session is restored, so the splash
// here was redundant on top of it. Removing it lets the real content start
// painting as soon as it's actually ready, instead of on an arbitrary timer.
export default function Index() {
  return <HomeScreen />;
}