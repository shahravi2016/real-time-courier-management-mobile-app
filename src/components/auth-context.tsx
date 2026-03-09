import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
    _id: string;
    name: string;
    email: string;
    role: 'admin' | 'branch_manager' | 'agent' | 'customer';
    branchId?: string;
    phone?: string;
    password?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (user: User) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: async () => { },
    logout: async () => { },
    updateUser: async () => { },
});

export const useAuth = () => useContext(AuthContext);

const SESSION_KEY = 'user_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load session on mount
    useEffect(() => {
        const loadSession = async () => {
            try {
                const storedUser = await AsyncStorage.getItem(SESSION_KEY);
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                console.error('Failed to load session:', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadSession();
    }, []);

    const login = useCallback(async (userData: User) => {
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userData));
        setUser(userData);
    }, []);

    const logout = useCallback(async () => {
        await AsyncStorage.removeItem(SESSION_KEY);
        setUser(null);
    }, []);

    const updateUser = useCallback(async (updates: Partial<User>) => {
        setUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, ...updates };
            AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}
