import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Pagination from '@/components/Pagination';

function renderPagination(props: { page: number; total: number; limit: number; onChange?: ReturnType<typeof vi.fn> }) {
  const onChange = props.onChange ?? vi.fn();
  render(<Pagination page={props.page} total={props.total} limit={props.limit} onChange={onChange} />);
  return { onChange };
}

describe('Pagination', () => {
  it('renders nothing when all results fit on one page', () => {
    const { container } = render(<Pagination page={1} total={10} limit={20} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when total equals limit', () => {
    const { container } = render(<Pagination page={1} total={20} limit={20} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the correct range text on the first page', () => {
    renderPagination({ page: 1, total: 47, limit: 20 });
    expect(screen.getByText('1–20 of 47')).toBeInTheDocument();
  });

  it('shows the correct range text on a middle page', () => {
    renderPagination({ page: 2, total: 47, limit: 20 });
    expect(screen.getByText('21–40 of 47')).toBeInTheDocument();
  });

  it('shows the correct range text on the last page', () => {
    renderPagination({ page: 3, total: 47, limit: 20 });
    expect(screen.getByText('41–47 of 47')).toBeInTheDocument();
  });

  it('Previous button is disabled on the first page', () => {
    renderPagination({ page: 1, total: 60, limit: 20 });
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });

  it('Next button is disabled on the last page', () => {
    renderPagination({ page: 3, total: 60, limit: 20 });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('Previous button is enabled when not on first page', () => {
    renderPagination({ page: 2, total: 60, limit: 20 });
    expect(screen.getByRole('button', { name: 'Previous' })).not.toBeDisabled();
  });

  it('Next button is enabled when not on last page', () => {
    renderPagination({ page: 1, total: 60, limit: 20 });
    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();
  });

  it('clicking Previous calls onChange with page - 1', async () => {
    const onChange = vi.fn();
    renderPagination({ page: 3, total: 100, limit: 20, onChange });
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('clicking Next calls onChange with page + 1', async () => {
    const onChange = vi.fn();
    renderPagination({ page: 2, total: 100, limit: 20, onChange });
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('clicking a page number calls onChange with that page', async () => {
    const onChange = vi.fn();
    renderPagination({ page: 1, total: 60, limit: 20, onChange });
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('current page button has the indigo highlight style', () => {
    renderPagination({ page: 2, total: 60, limit: 20 });
    const pageButton = screen.getByRole('button', { name: '2' });
    expect(pageButton).toHaveClass('bg-indigo-600');
  });

  it('shows ellipsis for non-contiguous page ranges', () => {
    renderPagination({ page: 5, total: 200, limit: 20 });
    // With 10 total pages and current page 5, pages 1, 4, 5, 6, 10 should show with ellipses
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
  });
});
