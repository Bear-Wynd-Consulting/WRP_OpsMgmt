'use server';

import { signIn, signOut } from '@/services/auth';
import { redirect } from 'next/navigation';

export async function loginAction(state: any, formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
        return { error: 'Username and password are required' };
    }

    const success = await signIn(username, password);

    if (success) {
        redirect('/');
    } else {
        return { error: 'Invalid credentials' };
    }
}

export async function logoutAction() {
    await signOut();
    redirect('/login');
}
