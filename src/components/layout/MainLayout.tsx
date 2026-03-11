import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import ChatLauncher from '@/components/chatbot/ChatLauncher';
import { useNavigate, useLocation } from 'react-router-dom';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (location.pathname !== '/search') {
          navigate('/search');
        }
      }

      if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
        // Export shortcut - handled by individual pages
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar - hidden on mobile, visible on desktop */}
        <div className="hidden md:block">
          <Sidebar isOpen={true} onClose={() => {}} />
        </div>

        {/* Mobile Sidebar */}
        <div className="md:hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>

      {/* Chatbot Launcher */}
      <ChatLauncher />
    </div>
  );
};

export default MainLayout;
