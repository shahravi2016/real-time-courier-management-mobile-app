import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
    _id: string;
    name: string;
    email: string;
    role: 'admin' | 'agent' | 'customer';
    phone?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (user: User) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: async () => { },
    logout: async () => { },
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
                const stored = await AsyncStorage.getItem(SESSION_KEY);
                if (stored) {
                    setUser(JSON.parse(stored));
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

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
