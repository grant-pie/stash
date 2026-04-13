import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ErrorState from '@/components/ErrorState';

describe('ErrorState', () => {
  it('renders the default message when no message prop is given', () => {
    render(<ErrorState />);
    expect(screen.getByText(/could not reach the server/i)).toBeInTheDocument();
  });

  it('renders a custom message when provided', () => {
    render(<ErrorState message="Something went wrong loading users." />);
    expect(screen.getByText('Something went wrong loading users.')).toBeInTheDocument();
  });

  it('renders the "Try again" button when onRetry is provided', () => {
    render(<ErrorState onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('does not render the "Try again" button when onRetry is omitted', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('calls onRetry when "Try again" is clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
