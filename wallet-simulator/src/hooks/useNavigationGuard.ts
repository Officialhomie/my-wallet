'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from '@/store';
import { canNavigateTo, getNavigationGuidance } from '@/lib/navigationGuards';

export function useNavigationGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const store = useStore();

  const navigateTo = (path: string) => {
    if (canNavigateTo(path, store, pathname)) {
      router.push(path);
    } else {
      const guidance = getNavigationGuidance(path, store);
      // Could show a toast or modal with the error message
      console.warn('Navigation blocked:', guidance.error);
      console.info('Suggested action:', guidance.action);
    }
  };

  const canNavigate = (path: string) => {
    return canNavigateTo(path, store, pathname);
  };

  const getGuidance = (path: string) => {
    return getNavigationGuidance(path, store);
  };

  return {
    navigateTo,
    canNavigate,
    getGuidance,
  };
}

// Hook for blocking navigation in forms
export function usePreventNavigation(shouldPrevent: boolean = false) {
  useEffect(() => {
    if (!shouldPrevent) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldPrevent]);
}
