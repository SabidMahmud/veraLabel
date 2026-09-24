'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, Shield, Activity } from 'lucide-react';

export default function AdminLoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn('credentials', {
                email: formData.email,
                password: formData.password,
                callbackUrl: '/admin/dashboard',
            });
            // NextAuth will redirect automatically on success
            // If we reach here, there was an error
        } catch (_err: unknown) {
            setError('An error occurred during login');
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="min-h-screen w-full flex bg-slate-50">
            {/* Left Side - Admin Branding */}
            <div className="hidden lg:flex lg:w-5/12 relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 z-0 opacity-5">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="admin-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <circle cx="2" cy="2" r="1" fill="currentColor" />
                                <circle cx="7" cy="7" r="0.5" fill="currentColor" />
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#admin-grid)" />
                    </svg>
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/50 to-transparent z-10" />

                <div className="relative z-20 flex flex-col justify-between w-full p-12 lg:p-16">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm">
                            <Shield className="w-3 h-3" />
                            Admin Portal
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-bold font-display tracking-tight leading-snug">
                            System Administration <span className="text-indigo-400">Dashboard</span>
                        </h1>
                        <p className="text-slate-400 leading-relaxed max-w-sm">
                            Manage doctors, monitor activity, and oversee the pathology diagnosis system.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-xs text-slate-500 border-t border-slate-800 pt-6">
                            <Activity className="w-4 h-4 text-indigo-400" />
                            <span>Secure Administrative Access</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-7/12 flex items-center justify-center p-6 lg:p-24">
                <div className="w-full max-w-[420px] space-y-8">
                    <div className="text-center lg:text-left">
                        <div className="lg:hidden inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                            <Shield className="w-3 h-3" />
                            Admin Portal
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Administrator Login</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Enter your admin credentials to access the dashboard.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                                <span className="mt-0.5">⚠️</span>
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium sm:text-sm shadow-sm"
                                        placeholder="admin@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Password
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        required
                                        className="block w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium sm:text-sm shadow-sm"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Access Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs text-slate-400">
                        Restricted to authorized administrators only.
                    </p>
                </div>
            </div>
        </div>
    );
}
