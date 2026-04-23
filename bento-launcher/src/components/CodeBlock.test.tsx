import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CodeBlock from './CodeBlock';

describe('CodeBlock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the code in a <pre> block with monospaced font', () => {
    render(<CodeBlock code="npm install" />);
    const pre = screen.getByText('npm install').closest('pre');
    expect(pre).toBeInTheDocument();
    expect(pre?.className).toContain('font-mono');
  });

  it('renders the code text correctly', () => {
    render(<CodeBlock code="python main.py --reload" />);
    expect(screen.getByText('python main.py --reload')).toBeInTheDocument();
  });

  it('renders the optional label when provided', () => {
    render(<CodeBlock code="echo hello" label="Paso 1" />);
    expect(screen.getByText('Paso 1')).toBeInTheDocument();
  });

  it('does not render a label when not provided', () => {
    render(<CodeBlock code="echo hello" />);
    // Only the button and code text should be present — no label span
    const allText = screen.queryByText('Paso 1');
    expect(allText).not.toBeInTheDocument();
  });

  it('shows "Copiar" button by default', () => {
    render(<CodeBlock code="ls -la" />);
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
  });

  it('copies code using navigator.clipboard and shows "✓ Copiado" feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(<CodeBlock code="docker compose up" />);
    const button = screen.getByRole('button', { name: 'Copiar' });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledWith('docker compose up');
    expect(screen.getByRole('button', { name: '✓ Copiado' })).toBeInTheDocument();
  });

  it('reverts to "Copiar" after 2 seconds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(<CodeBlock code="npm start" />);
    const button = screen.getByRole('button', { name: 'Copiar' });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByRole('button', { name: '✓ Copiado' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
  });

  it('uses document.execCommand fallback when clipboard API is unavailable', async () => {
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', { value: undefined, writable: true, configurable: true });
    document.execCommand = vi.fn().mockReturnValue(true);

    render(<CodeBlock code="pip install flask" />);
    const button = screen.getByRole('button', { name: 'Copiar' });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(screen.getByRole('button', { name: '✓ Copiado' })).toBeInTheDocument();

    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, writable: true, configurable: true });
  });

  it('has a dark background on the code container', () => {
    const { container } = render(<CodeBlock code="echo test" />);
    const wrapper = container.querySelector('.bg-zinc-900');
    expect(wrapper).toBeInTheDocument();
  });
});
