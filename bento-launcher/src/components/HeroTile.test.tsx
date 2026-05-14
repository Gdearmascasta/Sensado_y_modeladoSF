import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HeroTile from './HeroTile';

describe('HeroTile', () => {
  it('renders the course title (full name across spans)', () => {
    render(<HeroTile />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toMatch(/Sensado y Modelado/);
    expect(heading.textContent).toMatch(/de Sistemas Físicos/);
  });

  it('renders the UTB logo image', () => {
    render(<HeroTile />);
    const logo = screen.getByAltText('Logo UTB');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/logos/utb-logo.png');
  });

  it('shows "UTB" text fallback when the logo fails to load', () => {
    render(<HeroTile />);
    const logo = screen.getByAltText('Logo UTB');
    fireEvent.error(logo);
    expect(screen.getByText('UTB')).toBeInTheDocument();
    expect(screen.queryByAltText('Logo UTB')).not.toBeInTheDocument();
  });

  it('renders a brief description of the repository', () => {
    render(<HeroTile />);
    expect(screen.getByText(/hub del repositorio/i)).toBeInTheDocument();
  });

  it('uses an h1 heading for the course title', () => {
    render(<HeroTile />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.className).toContain('font-extrabold');
  });
});
