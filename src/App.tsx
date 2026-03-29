import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import HomePage from '@/app/page';
import NotesPage from '@/app/notes/page';
import BookNotesPage from '@/app/notes/[bookId]/page';
import ReaderPage from '@/app/reader/[id]/page';
import SettingsPage from '@/app/settings/page';
import { Providers } from '@/app/providers';
import { ClientLayout } from '@/components/ClientLayout';
import { AuthGate } from '@/components/AuthGate';

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <AuthGate>
          <ClientLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/notes/:bookId" element={<BookNotesPage />} />
              <Route path="/reader/:id" element={<ReaderPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate replace to="/" />} />
            </Routes>
          </ClientLayout>
        </AuthGate>
      </BrowserRouter>
    </Providers>
  );
}
