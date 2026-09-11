
'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { FormState } from '@/lib/types';
import { sendPasswordResetEmail } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';

// NOTE: Firebase Auth operations are now handled on the client-side to avoid server/client module conflicts.
// This file is intended for server-only logic, like managing session cookies in a more advanced setup.

export async function handleLogout() {
  // This is a placeholder for a more secure, backend-driven logout.
  // In a session-cookie-based system, this would call an API route
  // to clear the HttpOnly cookie.
  // For now, we will rely on the client-side Firebase SDK to sign out,
  // and this action can be removed or repurposed.
  const response = await fetch('/api/logout', { method: 'POST' });
  if (response.ok) {
      redirect('/');
  }
}


export async function handleForgotPassword(
  prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  // This action remains on the server because sending a password reset email
  // doesn't require an active user session and can be called safely.
  // To avoid the client-side module error, we initialize Firebase just-in-time inside the action.
  const { auth } = initializeFirebase();
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'O campo de email é obrigatório.' };
  }

  try {
    await sendPasswordResetEmail(auth, email);
    return {
      message: 'Se existir uma conta associada a este email, um link para redefinir a password foi enviado.',
    };
  } catch (error: any) {
    console.error('Password Reset Error:', error.code, error.message);
    // Do not reveal if the email exists or not for security reasons.
    // Return a generic message in both success and most error cases.
    return {
      message: 'Se existir uma conta associada a este email, um link para redefinir a password foi enviado.',
    };
  }
}
