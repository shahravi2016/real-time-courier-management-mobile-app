import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * A hook that provides a throttled version of the router to prevent 
 * double-tapping and opening multiple screens.
 */
export function useSafeNavigation() {
    const router = useRouter();
    const isNavigating = useRef(false);

    const safePush = useCallback((path: string, params?: any) => {
        if (isNavigating.current) return;

        isNavigating.current = true;
        router.push({ pathname: path as any, params });

        // Reset the lock after a short delay (navigation duration)
        setTimeout(() => {
            isNavigating.current = false;
        }, 500);
    }, [router]);

    const safeReplace = useCallback((path: string, params?: any) => {
        if (isNavigating.current) return;

        isNavigating.current = true;
        router.replace({ pathname: path as any, params });

        setTimeout(() => {
            isNavigating.current = false;
        }, 500);
    }, [router]);

    const safeBack = useCallback(() => {
        if (isNavigating.current) return;

        isNavigating.current = true;
        if (router.canGoBack()) {
            router.back();
        }

        setTimeout(() => {
            isNavigating.current = false;
        }, 500);
    }, [router]);

    return {
        ...router,
        push: safePush,
        replace: safeReplace,
        back: safeBack,
    };
}
