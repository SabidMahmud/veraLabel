// Run only against a disposable Compose project. This creates users and projects.
// node tests/deployment-smoke.mjs setup|verify /path/to/test.env /path/to/state.json
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const [phase, envFile, stateFile] = process.argv.slice(2);
assert(envFile && stateFile && ['setup', 'verify'].includes(phase), 'Supply phase, test env file, and state file.');
const env = Object.fromEntries((await readFile(envFile, 'utf8')).trim().split('\n').map(line => {
    const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)];
}));
const origin = env.NEXTAUTH_URL;
const checked = [];
function client() {
    const cookies = new Map();
    return async (path, options = {}) => {
        const response = await fetch(origin + path, { ...options, redirect: 'manual',
            headers: { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '), ...options.headers } });
        for (const raw of response.headers.getSetCookie()) {
            const part = raw.split(';')[0]; const at = part.indexOf('=');
            cookies.set(part.slice(0, at), part.slice(at + 1));
        }
        return response;
    };
}
const anonymous = client();
const admin = client();
const post = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function login(request, email, password) {
    const csrf = await (await request('/api/auth/csrf')).json();
    const response = await request('/api/auth/callback/credentials', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' },
        body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, callbackUrl: origin + '/projects' }),
    });
    assert(response.ok, 'Credential callback failed');
    const session = await (await request('/api/auth/session')).json();
    assert.equal(session.user?.email, email, 'Session was not issued');
    return session.user;
}
await login(admin, env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
checked.push('HTTP credential login and session cookies');
if (phase === 'setup') {
    for (const path of ['/api/projects', '/api/annotations', '/api/images/queue?projectId=000000000000000000000000']) {
        assert.equal((await anonymous(path)).status, 401, `${path} must require a session`);
    }
    assert.equal((await anonymous('/api/projects', post({}))).status, 401);
    assert.equal((await anonymous('/api/annotations', post({}))).status, 401);
    assert.equal((await anonymous('/api/auth/register', post({ name: 'Attack', email: 'attack@deployment.test', password: 'irrelevant', role: 'admin' }))).status, 403);
    assert.equal((await anonymous('/api/projects', { headers: { 'x-user-id': '000000000000000000000001' } })).status, 401);
    assert.equal((await anonymous('/admin/dashboard')).status, 307);
    checked.push('Anonymous API denial, disabled registration, spoofed header denial, page protection');
    const projectRes = await admin('/api/projects', post({ name: 'Deployment smoke test', description: 'Disposable test images',
        labels: [{ name: 'Normal', color: '#00ff00' }, { name: 'Abnormal', color: '#ff0000' }], consensusRequired: 2,
        ownerId: '000000000000000000000001' }));
    assert.equal(projectRes.status, 201);
    const project = await projectRes.json();
    const session = await (await admin('/api/auth/session')).json();
    assert.equal(project.ownerId, session.user.id, 'Project owner must come from the session');
    const doctorRes = await admin('/api/admin/doctors', post({ name: 'Test Annotator', email: 'annotator@deployment.test', password: 'Temporary-test-password-123!' }));
    assert.equal(doctorRes.status, 201);
    const doctor = await doctorRes.json();
    await writeFile(stateFile, JSON.stringify({ projectId: project._id, doctorId: doctor._id, adminId: session.user.id }), { mode: 0o600 });
    checked.push('Project creation with session owner and annotator provisioning');
    console.log(JSON.stringify({ projectId: project._id, checked }));
} else {
    const state = JSON.parse(await readFile(stateFile, 'utf8'));
    const user = client();
    await login(user, 'annotator@deployment.test', 'Temporary-test-password-123!');
    const queuePath = `/api/images/queue?projectId=${state.projectId}&userId=${state.adminId}`;
    const queue = await user(queuePath);
    assert.equal(queue.status, 200);
    const image = await queue.json();
    assert.equal(image.path, '/images/dataset-a/sample%20image.png');
    assert.equal((await anonymous(image.path)).status, 401);
    const authenticatedImage = await user(image.path);
    assert.equal(authenticatedImage.status, 200);
    assert(authenticatedImage.headers.get('cache-control').includes('private'));
    assert((await authenticatedImage.arrayBuffer()).byteLength > 0);
    checked.push('Imported image queue, URL encoding, protected image serving');
    assert.equal((await user('/api/projects', post({ name: 'forbidden' }))).status, 403);
    assert.equal((await user('/api/admin/doctors')).status, 403);
    assert.equal((await user('/api/annotations')).status, 403, 'Annotators cannot read other labels');
    const invalid = await user('/api/annotations', post({ projectId: state.projectId, imageId: '000000000000000000000001', label: 'Normal' }));
    assert.equal(invalid.status, 404);
    const save = await user('/api/annotations', post({ projectId: state.projectId, imageId: image._id,
        userId: state.adminId, label: 'Normal', notes: 'Disposable verification' }));
    assert.equal(save.status, 201);
    assert.equal((await save.json()).userId, state.doctorId, 'Annotation identity must come from session');
    assert.equal((await user(queuePath)).status, 404, 'User must not see an annotated image again');
    const adminQueue = await admin(`/api/images/queue?projectId=${state.projectId}&userId=${state.doctorId}`);
    assert.equal(adminQueue.status, 200, 'Another user must still receive the image');
    const secondSave = await admin('/api/annotations', post({ projectId: state.projectId, imageId: image._id, label: 'Normal' }));
    assert.equal(secondSave.status, 201);
    assert.equal((await admin(`/api/images/queue?projectId=${state.projectId}`)).status, 404);
    const annotations = await (await admin(`/api/annotations?projectId=${state.projectId}`)).json();
    assert.equal(annotations.length, 2);
    const stats = await (await admin('/api/admin/stats')).json();
    assert.equal(stats.totalAnnotations, 2);
    checked.push('Role checks, session-bound identity, blind queue, completion threshold, admin statistics');
    const deactivate = await admin(`/api/admin/doctors/${state.doctorId}`, { method: 'DELETE' });
    assert.equal(deactivate.status, 200);
    assert.equal((await user('/api/projects')).status, 401, 'Existing session must not authorize deactivated account');
    assert.equal((await user(image.path)).status, 401);
    checked.push('Deactivation invalidates API and image access');
    console.log(JSON.stringify({ checked }));
}
