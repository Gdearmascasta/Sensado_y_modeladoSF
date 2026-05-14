import { useCallback } from 'react';
import type { StreamLine } from '../types';

const SILENCE_TIMEOUT_MS = 30_000;

export function useProgressStream() {
  const consume = useCallback(async (
    url: string,
    method: 'GET' | 'POST',
    body: BodyInit | null,
    onLine: (line: StreamLine) => void,
    onDone: (line: StreamLine) => void,
    onError: (line: StreamLine) => void,
  ): Promise<void> => {
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let abortController: AbortController | null = new AbortController();

    const clearSilenceTimer = () => {
      if (silenceTimer !== null) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    const resetSilenceTimer = (onTimeout: () => void) => {
      clearSilenceTimer();
      silenceTimer = setTimeout(onTimeout, SILENCE_TIMEOUT_MS);
    };

    const cleanup = () => {
      clearSilenceTimer();
      abortController = null;
    };

    try {
      const response = await fetch(url, {
        method,
        headers: body !== null ? { 'Content-Type': 'application/json' } : {},
        body,
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorLine: StreamLine = {
          stage: 'error',
          progress: 0,
          message: `HTTP error ${response.status}`,
          error: `Request failed with status ${response.status}: ${response.statusText}`,
        };
        cleanup();
        onError(errorLine);
        return;
      }

      if (!response.body) {
        const errorLine: StreamLine = {
          stage: 'error',
          progress: 0,
          message: 'No response body',
          error: 'The server returned an empty response body.',
        };
        cleanup();
        onError(errorLine);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let done = false;

      // Start the silence timeout — fires if no data arrives for 30s
      const handleSilenceTimeout = () => {
        const errorLine: StreamLine = {
          stage: 'error',
          progress: 0,
          message: 'Conexión interrumpida: sin datos durante 30 segundos',
          error: 'Silence timeout: no data received for 30 seconds.',
        };
        // Abort the fetch so the reader loop exits
        if (abortController) {
          abortController.abort();
        }
        cleanup();
        onError(errorLine);
      };

      resetSilenceTimer(handleSilenceTimeout);

      while (!done) {
        let readResult: ReadableStreamReadResult<Uint8Array>;
        try {
          readResult = await reader.read();
        } catch {
          // Reader was aborted (e.g. by silence timeout) — exit quietly
          break;
        }

        const { value, done: streamDone } = readResult;
        done = streamDone;

        if (value) {
          // Reset silence timer on every received chunk
          resetSilenceTimer(handleSilenceTimeout);
          buffer += decoder.decode(value, { stream: true });

          // Split on newlines to extract complete NDJSON lines
          const lines = buffer.split('\n');
          // Keep the last (potentially incomplete) fragment in the buffer
          buffer = lines.pop() ?? '';

          for (const raw of lines) {
            const trimmed = raw.trim();
            if (!trimmed) continue;

            let parsed: StreamLine;
            try {
              parsed = JSON.parse(trimmed) as StreamLine;
            } catch {
              const errorLine: StreamLine = {
                stage: 'error',
                progress: 0,
                message: 'JSON malformado recibido del servidor',
                error: `Failed to parse line: ${trimmed}`,
              };
              clearSilenceTimer();
              onError(errorLine);
              return;
            }

            onLine(parsed);

            if (parsed.stage === 'done') {
              clearSilenceTimer();
              onDone(parsed);
              return;
            }

            if (parsed.stage === 'error') {
              clearSilenceTimer();
              onError(parsed);
              return;
            }
          }
        }
      }

      // Stream ended without a "done" or "error" line — process any remaining buffer
      clearSilenceTimer();
      const remaining = buffer.trim();
      if (remaining) {
        let parsed: StreamLine;
        try {
          parsed = JSON.parse(remaining) as StreamLine;
          onLine(parsed);
          if (parsed.stage === 'done') {
            onDone(parsed);
          } else if (parsed.stage === 'error') {
            onError(parsed);
          }
        } catch {
          const errorLine: StreamLine = {
            stage: 'error',
            progress: 0,
            message: 'JSON malformado en el último fragmento',
            error: `Failed to parse final fragment: ${remaining}`,
          };
          onError(errorLine);
        }
      }
    } catch (err: unknown) {
      clearSilenceTimer();
      // Ignore AbortError — it was triggered intentionally by the silence timeout
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const errorLine: StreamLine = {
        stage: 'error',
        progress: 0,
        message: 'Error de red al conectar con el servidor',
        error: err instanceof Error ? err.message : String(err),
      };
      onError(errorLine);
    }
  }, []);

  return { consume };
}
