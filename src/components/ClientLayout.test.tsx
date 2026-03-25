import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ClientLayout } from '@/components/ClientLayout';

vi.mock('@/components/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>
}));

describe('ClientLayout', () => {
  it('shows the sidebar on non-reader routes', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route
            path="*"
            element={
              <ClientLayout>
                <div data-testid="page-content">Page</div>
              </ClientLayout>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('hides the sidebar on reader routes', () => {
    render(
      <MemoryRouter initialEntries={['/reader/book-1']}>
        <Routes>
          <Route
            path="*"
            element={
              <ClientLayout>
                <div data-testid="page-content">Page</div>
              </ClientLayout>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });
});
