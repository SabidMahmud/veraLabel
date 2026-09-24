'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, Microscope, Activity, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
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
            const result = await signIn('credentials', {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            if (result?.error) {
                setError('Invalid email or password');
                setLoading(false);
                return;
            }

            if (result?.ok) {
                router.push('/viewer');
                router.refresh();
            }
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
            {/* Left Side - Research Context */}
            <div className="hidden lg:flex lg:w-5/12 relative bg-slate-900 text-white overflow-hidden">
                {/* Background Pattern - Abstract Cells */}
                <div className="absolute inset-0 z-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <circle cx="1" cy="1" r="1.5" fill="currentColor" />
                                <circle cx="6" cy="6" r="1" fill="currentColor" />
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#grid)" />
                    </svg>
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-teal-900/90 to-slate-900/40 z-10" />

                <div className="relative z-20 flex flex-col justify-between w-full p-12 lg:p-16">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm">
                            <Activity className="w-3 h-3" />
                            Research Portal
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-bold font-display tracking-tight leading-snug">
                            Cervical Cancer Detection <span className="text-teal-400">Research Initiative</span>
                        </h1>
                        <p className="text-slate-400 leading-relaxed max-w-sm">
                            Contributing to the advancement of automated cytopathology through expert annotation and AI-driven analysis.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <div className="flex gap-4">
                            <div className="flex-1 p-4 rounded-xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm">
                                <Microscope className="w-6 h-6 text-teal-400 mb-3" />
                                <h3 className="font-semibold text-sm mb-1">High-Res Imaging</h3>
                                <p className="text-xs text-slate-400">Whole slide imaging analysis</p>
                            </div>
                            <div className="flex-1 p-4 rounded-xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm">
                                <ShieldCheck className="w-6 h-6 text-teal-400 mb-3" />
                                <h3 className="font-semibold text-sm mb-1">Secure Protocol</h3>
                                <p className="text-xs text-slate-400">HIPAA-compliant platform</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 border-t border-slate-800 pt-6">
                            <span>v0.1.0-alpha</span>
                            <span>•</span>
                            <span>Authorized Personnel Only</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-7/12 flex items-center justify-center p-6 lg:p-24">
                <div className="w-full max-w-[420px] space-y-8">
                    <div className="text-center lg:text-left">
                        <div className="lg:hidden inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold">
                            <Activity className="w-3 h-3" />
                            Research Portal
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Doctor Login</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Enter your credentials to access the annotation workspace.
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
                                        <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium sm:text-sm shadow-sm"
                                        placeholder="researcher@institute.org"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Password
                                    </label>
                                    <Link
                                        href="/auth/forgot-password"
                                        className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline tabindex='-1'"
                                    >
                                        Recover Access
                                    </Link>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        required
                                        className="block w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium sm:text-sm shadow-sm"
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
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Authenticate Session <ArrowRight className="ml-2 w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs text-slate-400">
                        Restricted Access System. All activities are monitored and logged. <br />
                        For technical support, contact the <a href="#" className="font-medium text-teal-600 hover:underline">System Administrator</a>.
                    </p>
                </div>
            </div>
        </div>
    );
}
