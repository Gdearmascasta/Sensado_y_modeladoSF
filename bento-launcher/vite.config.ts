import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'child_process'
import { join } from 'path'

// Map of appId -> array of child processes
const activeProcesses = new Map<string, any[]>();
// Map of appId -> accumulated log lines (last 200 lines max)
const processLogs = new Map<string, string[]>();

const MAX_LOG_LINES = 200;

function appendLog(appId: string, line: string) {
  if (!processLogs.has(appId)) {
    processLogs.set(appId, []);
  }
  const logs = processLogs.get(appId)!;
  logs.push(line);
  if (logs.length > MAX_LOG_LINES) {
    logs.splice(0, logs.length - MAX_LOG_LINES);
  }
}

const systemCommandPlugin = () => ({
  name: 'system-command',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === '/api/run-command' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { command, appId } = JSON.parse(body);
            const rootDir = join(process.cwd(), '..');
            
            const child = spawn('bash', ['-c', command], { 
                cwd: rootDir,
                detached: true,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            // Capture stdout and stderr into logs
            if (appId) {
                if (child.stdout) {
                    child.stdout.on('data', (data: Buffer) => {
                        const lines = data.toString().split('\n').filter((l: string) => l.length > 0);
                        lines.forEach((line: string) => appendLog(appId, line));
                    });
                }
                if (child.stderr) {
                    child.stderr.on('data', (data: Buffer) => {
                        const lines = data.toString().split('\n').filter((l: string) => l.length > 0);
                        lines.forEach((line: string) => appendLog(appId, `[stderr] ${line}`));
                    });
                }
            }

            child.unref();

            if (appId) {
                if (!activeProcesses.has(appId)) {
                    activeProcesses.set(appId, []);
                }
                activeProcesses.get(appId)!.push(child);

                // Auto-cleanup when the process exits on its own (crash, kill, etc.)
                child.on('exit', (code: number | null) => {
                    if (code !== null && code !== 0) {
                        appendLog(appId, `[exit] Proceso terminó con código ${code}`);
                    }
                    const list = activeProcesses.get(appId);
                    if (!list) return;
                    const remaining = list.filter((p: any) => p !== child);
                    if (remaining.length === 0) {
                        activeProcesses.delete(appId);
                    } else {
                        activeProcesses.set(appId, remaining);
                    }
                });
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, pid: child.pid }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(e) }));
          }
        });
      } else if (req.url === '/api/stop-app' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { appId } = JSON.parse(body);

            if (appId && activeProcesses.has(appId)) {
                const processes = activeProcesses.get(appId)!;
                for (const child of processes) {
                    // Skip processes that already exited on their own
                    if (child.exitCode !== null || !child.pid) continue;

                    try {
                        // Kill the whole process group (bash + python + uvicorn + node ...)
                        process.kill(-child.pid, 'SIGTERM');
                    } catch (err: any) {
                        // ESRCH = process already gone — that's the desired end-state, ignore
                        if (err && err.code !== 'ESRCH') {
                            console.error(`Error killing process ${child.pid}:`, err);
                        }
                    }
                }
                activeProcesses.delete(appId);
            }

            // Clear logs for this app
            if (appId) processLogs.delete(appId);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(e) }));
          }
        });
      } else if (req.url === '/api/active-apps' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        const activeAppIds = Array.from(activeProcesses.keys());
        res.end(JSON.stringify({ activeApps: activeAppIds }));
      } else if (req.url?.startsWith('/api/logs/') && req.method === 'GET') {
        // GET /api/logs/:appId — returns the captured logs for an app
        const appId = req.url.replace('/api/logs/', '');
        const logs = processLogs.get(appId) || [];
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ appId, logs }));
      } else {
        next();
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), systemCommandPlugin()],
})
