import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exec } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const systemCommandPlugin = () => ({
  name: 'system-command',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === '/api/run-command' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { command } = JSON.parse(body);

            // The parent directory of bento-launcher (i.e. Sensado_y_modeladoSF)
            const rootDir = join(process.cwd(), '..');

            // Write the full command to a temp shell script to avoid
            // AppleScript escaping nightmares with paths that have spaces.
            const tmpDir = tmpdir();
            const scriptPath = join(tmpDir, `launcher_${Date.now()}.sh`);
            const scriptContent = [
              '#!/bin/bash',
              `cd "${rootDir}"`,
              command,
            ].join('\n');

            writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

            // Now open a Terminal window that just runs this simple script path
            // (no spaces or special chars in /tmp path — safe to embed directly)
            const appleScript = `tell application "Terminal" to do script "bash ${scriptPath}"`;
            exec(`osascript -e '${appleScript}'`, (err) => {
              if (err) console.error('Error executing osascript:', err);
            });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(e) }));
          }
        });
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
