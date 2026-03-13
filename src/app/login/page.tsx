'use client';

import { useActionState } from 'react';
import { loginAction } from './actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
    const [state, formAction, pending] = useActionState(loginAction, null);

    return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <form action={formAction} className="space-y-4 w-full max-w-sm border p-6 rounded shadow-sm bg-white">
                <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

                {state?.error && (
                    <div className="text-red-500 mb-4 text-center">{state.error}</div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                <Button type="submit" className="w-full" disabled={pending}>
                    {pending ? 'Logging in...' : 'Login'}
                </Button>
            </form>
        </div>
    );
}
