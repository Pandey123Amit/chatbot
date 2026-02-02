'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Redirect based on role
      if (session?.user?.role === 'ADMIN') {
        router.push('/admin');
      } else if (session?.user?.role === 'AGENT') {
        router.push('/agent');
      } else {
        router.push('/chat');
      }
    },
    [router, session]
  );

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    router.push('/login');
  }, [router]);

  const isAdmin = session?.user?.role === 'ADMIN';
  const isAgent = session?.user?.role === 'AGENT';
  const isCustomer = session?.user?.role === 'CUSTOMER';

  return {
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    isAdmin,
    isAgent,
    isCustomer,
    login,
    logout,
  };
}
