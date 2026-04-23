import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Header from './Header';

describe('Header', () => {
  it('renders the course title', () => {
    render(<Header />);
    expect(
      screen.getByText('Sensado y Modelado de Sistemas Físicos'),
    ).toBeInTheDocument();
  });

  it('renders a brief description', () => {
    render(<Header />);
    expect(
      screen.getByText(/hub central del repositorio/i),
    ).toBeInTheDocument();
  });

  it('renders the UTB logo image', () => {
    render(<Header />);
    const logo = screen.getByAltText('Logo UTB');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/logos/utb-logo.png');
  });

  it('shows "UTB" text fallback when logo fails to load', () => {
    render(<Header />);
    const logo = screen.getByAltText('Logo UTB');
    fireEvent.error(logo);
    expect(screen.getByText('UTB')).toBeInTheDocument();
    expect(screen.queryByAltText('Logo UTB')).not.toBeInTheDocument();
  });

  it('uses sans-serif typography with clear hierarchy', () => {
    render(<Header />);
    const title = screen.getByText('Sensado y Modelado de Sistemas Físicos');
    expect(title.tagName).toBe('H1');
    expect(title.className).toContain('font-bold');
  });
});
