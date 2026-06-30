import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type AdminUser = {
  id: string;
  email: string;
};

const toAdminUser = (user: User): AdminUser | null => {
  return {
    id: user.id,
    email: user.email ?? 'admin',
  };
};

const currentUserHasAdminAccess = async () => {
  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase.rpc('current_user_is_admin');

  if (error) {
    return false;
  }

  return data === true;
};

export const getCurrentAdminUser = async () => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const isAdmin = await currentUserHasAdminAccess();

  if (!isAdmin) {
    return null;
  }

  return toAdminUser(data.user);
};

export const signInAdmin = async (email: string, password: string) => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Korisnik nije pronađen.');
  }

  const isAdmin = await currentUserHasAdminAccess();

  if (!isAdmin) {
    await supabase.auth.signOut();
    throw new Error('Korisnik nema admin pristup.');
  }

  return toAdminUser(data.user);
};

export const signOutAdmin = async () => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
};

export { isSupabaseConfigured };
