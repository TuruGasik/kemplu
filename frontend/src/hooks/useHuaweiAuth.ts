import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient, MOCK_SESSION_TOKEN, sessionStore } from '../api/client';

interface HuaweiAuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  startDemoSession: () => void;
  logout: () => Promise<void>;
  completeCallback: (token: string | null) => void;
}

export function useHuaweiAuth(): HuaweiAuthState {
  const [token, setToken] = useState<string | null>(() => sessionStore.getToken());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(sessionStore.getToken());
  }, []);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    sessionStore.stopDemoMode();
    try {
      const { auth_url } = await apiClient.auth.login();
      window.location.assign(auth_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start Huawei authorization');
      setIsLoading(false);
    }
  }, []);

  const startDemoSession = useCallback(() => {
    setError(null);
    sessionStore.startDemoMode();
    setToken(MOCK_SESSION_TOKEN);
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.auth.logout();
      setToken(null);
    } catch (err) {
      sessionStore.clear();
      setToken(null);
      setError(err instanceof Error ? err.message : 'Logout failed');
    } finally {
      setIsLoading(false);
      window.location.assign('/login');
    }
  }, []);

  const completeCallback = useCallback((callbackToken: string | null) => {
    if (!callbackToken) {
      setError('Missing session token from OAuth callback');
      return;
    }
    sessionStore.setToken(callbackToken);
    setToken(callbackToken);
  }, []);

  return useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      isLoading,
      error,
      connect,
      startDemoSession,
      logout,
      completeCallback,
    }),
    [connect, completeCallback, error, isLoading, logout, startDemoSession, token],
  );
}
