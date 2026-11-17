// Starts the production server, waits for it, runs the E2E suites and visual capture,
// then stops the server. Invoked inside `firebase emulators:exec` (see package.json).
import { spawn } from 'node:child_process';

const PORT = process.env.E2E_PORT || '3100';
const server = spawn('npx', ['next', 'start', '-p', PORT, '-H', '127.0.0.1'], { stdio: 'inherit', env: process.env });
const stop = () => { try { server.kill('SIGTERM'); } catch { /* already stopped */ } };
process.on('exit', stop);

async function waitForServer() {
  for (let i = 0; i < 90; i += 1) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/login`); if (r.ok) return; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('next start did not become ready');
}
const run = (cmd, args) => new Promise((resolve) => {
  const p = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, E2E_BASE_URL: `http://127.0.0.1:${PORT}` } });
  p.on('exit', (code) => resolve(code ?? 1));
});

await waitForServer();
const tests = await run('node', ['--test', '--test-concurrency=1', 'tests/e2e/parentChild.e2e.test.mjs', 'tests/e2e/browser.e2e.test.mjs']);
const visual = await run('node', ['scripts/e2e/visual-qa.mjs']);
stop();
process.exit(tests || visual);
