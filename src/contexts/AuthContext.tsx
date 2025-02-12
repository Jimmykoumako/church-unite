import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.ts';
import { Navigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (formData: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  checkRole: () => Promise<string | null>;
}

interface SignUpData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (formData: SignUpData) => {
    const { email, password, ...memberData } = formData;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: memberData
      }
    });
    if (authError) throw authError;

    const { error: profileError } = await supabase
      .from('members')
      .insert([{
        id: authData.user?.id,
        ...memberData,
        role: 'member'
      }]);
    
    if (profileError) throw profileError;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const checkRole = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('members')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !data) return null;
    return data.role;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, checkRole }}>
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

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
}