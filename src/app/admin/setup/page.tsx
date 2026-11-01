import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verifyAdmin } from '@/lib/middleware-admin';

export default async function SetupPage() {
    if (!await verifyAdmin()) redirect('/admin/login');
    return <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
        <div className="mx-auto max-w-3xl space-y-8">
            <Link className="text-blue-700 underline" href="/admin/dashboard">Back to administration</Link>
            <div><h1 className="text-3xl font-bold">Set up your annotation workspace</h1>
                <p className="mt-3 text-slate-600">Your database and administrator account were created during deployment. Next, connect a dataset and invite your team.</p></div>
            <ol className="list-decimal space-y-7 pl-6">
                <li><h2 className="text-xl font-semibold">Create a project</h2>
                    <p className="mt-2">Choose a name, annotator instructions, labels, and the number of independent annotations needed per image.</p>
                    <Link className="mt-2 inline-block text-blue-700 underline" href="/admin/projects/new">Create a project</Link>
                    <p className="mt-2 text-sm text-slate-600">The annotation count does not measure agreement. Conflict adjudication is not available yet.</p></li>
                <li><h2 className="text-xl font-semibold">Place images in persistent storage</h2>
                    <p className="mt-2">For Docker Compose, copy images into the host folder configured by DATA_FOLDER_PATH. For Kubernetes, copy them into the veralabel-images volume, or connect your existing dataset storage.</p>
                    <p className="mt-2">Keep datasets in separate folders, such as <code>dataset-a/slide1.tif</code>. Files stay on your server.</p></li>
                <li><h2 className="text-xl font-semibold">Register the image files</h2>
                    <p className="mt-2">Run the image import command from the README using the project ID and dataset folder. The importer generates the image links automatically. You can run it again to register new files.</p>
                    <Link className="mt-2 inline-block text-blue-700 underline" href="/projects">Find your project ID</Link></li>
                <li><h2 className="text-xl font-semibold">Create annotator accounts</h2>
                    <p className="mt-2">Use Add Doctor on the administration dashboard to create an annotator account. Share the site URL and credentials privately. Public self-registration is disabled.</p>
                    <Link className="mt-2 inline-block text-blue-700 underline" href="/admin/dashboard">Manage accounts</Link></li>
                <li><h2 className="text-xl font-semibold">Verify the workflow</h2>
                    <p className="mt-2">Sign in as an annotator, choose the project, confirm an image loads, then save a label. Back up both MongoDB and the image files before collecting research annotations.</p>
                    <Link className="mt-2 inline-block text-blue-700 underline" href="/projects">Open projects</Link></li>
            </ol>
        </div>
    </main>;
}
