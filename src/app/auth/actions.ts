'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE } from '@/server/authorization';

export async function handleLogout(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}
