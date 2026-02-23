'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
    loginWithGoogle: () => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    const hasPermission = (permission: string) => {
        return true;
    };

    // Fetch the profile from our `profiles` table and map to User type
    const fetchProfile = async (userId: string): Promise<User | null> => {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            console.error('[AuthContext] Error fetching profile:', error);
            return null;
        }

        return {
            id: profile.id,
            login: profile.username,
            entity: profile.company_id,
            firstname: profile.firstname,
            lastname: profile.lastname,
            email: profile.email,
            user_mobile: profile.user_mobile,
            admin: profile.is_admin === true,
            workplace_center_id: undefined,
            work_centers_ids: undefined,
            array_options: {
                options_dni: profile.dni,
                options_naf: profile.naf,
            }
        };
    };

    const refreshUser = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (authUser) {
                const profile = await fetchProfile(authUser.id);
                setUser(profile);
            } else {
                setUser(null);
            }
        } catch (e) {
            console.error('[AuthContext] Error refreshing user:', e);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Initial load
        refreshUser();

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    const profile = await fetchProfile(session.user.id);
                    setUser(profile);
                    setIsLoading(false);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setIsLoading(false);
                } else if (event === 'TOKEN_REFRESHED') {
                    // Session refreshed automatically by Supabase
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Login by username: look up the email for that username, then sign in
    const login = async (username: string, password: string) => {
        try {
            // Step 1: Look up email by username using our API route
            const lookupRes = await fetch('/api/auth/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });

            if (!lookupRes.ok) {
                return { success: false, message: 'Usuario no encontrado' };
            }

            const { email } = await lookupRes.json();

            if (!email) {
                return { success: false, message: 'Usuario no encontrado' };
            }

            // Step 2: Sign in with email + password
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('[AuthContext] Login error:', error.message);
                let message = 'Credenciales inválidas';

                if (error.message.includes('Invalid login credentials')) {
                    message = 'Usuario o contraseña incorrectos. Inténtelo de nuevo';
                } else if (error.message.includes('Email not confirmed')) {
                    message = 'Email no confirmado. Revisa tu correo.';
                }

                return { success: false, message };
            }

            // Profile will be loaded by onAuthStateChange
            return { success: true };
        } catch (e: any) {
            console.error('[AuthContext] Login error:', e);
            return {
                success: false,
                message: e.message || 'Error de conexión'
            };
        }
    };

    // Login with Google OAuth
    const loginWithGoogle = async () => {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                return { success: false, message: error.message };
            }

            return { success: true };
        } catch (e: any) {
            return { success: false, message: e.message || 'Error de conexión' };
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);

        // Force complete cleanup by dispatching a custom event
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }

        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, logout, hasPermission, login, loginWithGoogle, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
