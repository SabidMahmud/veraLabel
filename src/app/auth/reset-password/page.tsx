'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, Loader2, ArrowLeft, CheckCircle, Mail } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [formData, setFormData] = useState({
        email: '',
        otp: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setFormData(prev => ({ ...prev, email: emailParam }));
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    otp: formData.otp,
                    newPassword: formData.newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to reset password');
                setLoading(false);
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err) {
            setError('An error occurred. Please try again.');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 mb-4">
                                <CheckCircle className="h-10 w-10 text-teal-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">Password Reset Successful!</h2>
                            <p className="text-slate-600 mb-6">
                                Your password has been changed successfully. You can now login with your new password.
                            </p>
                            <p className="text-sm text-slate-500">
                                Redirecting to login page...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link
                        href="/login"
                        className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Login
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 mt-4">Reset Password</h1>
                    <p className="mt-2 text-slate-600">
                        Enter the OTP sent to your email and create a new password.
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                                    placeholder="doctor@hospital.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-2">
                                6-Digit OTP
                            </label>
                            <input
                                id="otp"
                                name="otp"
                                type="text"
                                required
                                maxLength={6}
                                pattern="[0-9]{6}"
                                className="block w-full px-3 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition text-center text-2xl tracking-widest font-mono"
                                placeholder="000000"
                                value={formData.otp}
                                onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '') })}
                                disabled={loading}
                            />
                            <p className="mt-1 text-xs text-slate-500">Enter the 6-digit code sent to your email</p>
                        </div>

                        <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="newPassword"
                                    name="newPassword"
                                    type="password"
                                    required
                                    minLength={8}
                                    className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                                    placeholder="••••••••"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    minLength={8}
                                    className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3 px-4 rounded-lg shadow-md text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Reset Password <ArrowRight className="ml-2 w-4 h-4" />
                                </>
                            )}
                        </button>

                        <div className="text-center mt-4">
                            <Link
                                href="/auth/forgot-password"
                                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                            >
                                Didn&apos;t receive OTP? Request new one
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
                    <p className="mt-2 text-sm text-slate-500">Loading...</p>
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
