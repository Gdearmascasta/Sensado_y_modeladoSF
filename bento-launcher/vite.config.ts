import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'child_process'
import { join } from 'path'

// Map of appId -> array of child processes
const activeProcesses = new Map<string, any[]>();

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
                stdio: 'ignore'
            });
            
            child.unref();

            if (appId) {
                if (!activeProcesses.has(appId)) {
                    activeProcesses.set(appId, []);
                }
                activeProcesses.get(appId)!.push(child);
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
                    try {
                        if (child.pid) {
                            process.kill(-child.pid); // Kill process group
                        }
                    } catch (err) {
                        console.error(`Error killing process ${child.pid}:`, err);
                    }
                }
                activeProcesses.delete(appId);
            }

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
