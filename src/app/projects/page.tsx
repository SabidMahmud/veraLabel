'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

interface Project { _id: string; name: string; description: string }
export default function ProjectsPage() {
    const { data: session, status } = useSession();
    const [projects, setProjects] = useState<Project[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/projects').then(async response => {
            if (!response.ok) throw new Error('Unable to load projects. Please sign in again.');
            setProjects(await response.json());
        }).catch(error => setError(error.message)).finally(() => setLoading(false));
    }, [status]);
    const role = (session?.user as { role?: string })?.role;
    return <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div><h1 className="text-3xl font-bold">VeraLabel projects</h1>
                    <p className="mt-2 text-slate-600">Choose a dataset to start annotating.</p></div>
                <div className="flex gap-5">
                    {role === 'admin' && <Link className="text-blue-700 underline" href="/admin/dashboard">Administration</Link>}
                    <button className="text-blue-700 underline" onClick={() => signOut({ callbackUrl: '/login' })}>Sign out</button>
                </div>
            </div>
            {error && <p role="alert" className="text-red-700">{error}</p>}
            {loading ? <p>Loading projects...</p> : projects.length === 0 ?
                <p>No projects yet. Ask your administrator to create a project and import its images.</p> :
                <ul className="space-y-4">{projects.map(project => <li key={project._id} className="rounded-lg border border-slate-200 bg-white p-6">
                    <Link className="text-xl font-semibold text-blue-700 underline" href={`/viewer?projectId=${project._id}`}>{project.name}</Link>
                    <p className="mt-2">{project.description}</p>
                    <p className="mt-3 text-sm text-slate-600">Project ID: <code className="select-all">{project._id}</code></p>
                </li>)}</ul>}
            {role === 'admin' && <Link className="inline-block rounded bg-blue-700 px-4 py-2 text-white" href="/admin/projects/new">Create project</Link>}
        </div>
    </main>;
}
