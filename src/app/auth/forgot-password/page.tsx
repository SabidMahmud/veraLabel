'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to send reset email');
                setLoading(false);
                return;
            }

            setSuccess(true);
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 mb-4">
                                <CheckCircle className="h-10 w-10 text-teal-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Check Your Email</h2>
                        </div>

                        <div className="space-y-4 text-center">
                            <p className="text-slate-600">
                                We&apos;ve sent a 6-digit OTP to <strong>{email}</strong>
                            </p>
                            <p className="text-sm text-slate-500">
                                The OTP will expire in 10 minutes. Please check your inbox and use it to reset your password.
                            </p>

                            <button
                                onClick={() => router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`)}
                                className="w-full mt-6 flex justify-center items-center py-3 px-4 rounded-lg shadow-md text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition"
                            >
                                Continue to Reset Password <ArrowRight className="ml-2 w-4 h-4" />
                            </button>

                            <Link
                                href="/login"
                                className="block mt-4 text-sm text-teal-600 hover:text-teal-700 font-medium"
                            >
                                Back to Login
                            </Link>
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
                    <h1 className="text-3xl font-bold text-slate-900 mt-4">Forgot Password?</h1>
                    <p className="mt-2 text-slate-600">
                        Enter your email address and we&apos;ll send you an OTP to reset your password.
                    </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3 px-4 rounded-lg shadow-md text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Send Reset OTP <ArrowRight className="ml-2 w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
