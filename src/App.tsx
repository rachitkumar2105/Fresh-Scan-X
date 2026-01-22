import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Backend Context
interface BackendContextType {
  isBackendReady: boolean;
  checkBackendStatus: () => Promise<void>;
}

const BackendContext = createContext<BackendContextType | undefined>(undefined);

export const useBackend = () => {
  const context = useContext(BackendContext);
  if (!context) {
    throw new Error("useBackend must be used within a BackendProvider");
  }
  return context;
};

const BackendProvider = ({ children }: { children: ReactNode }) => {
  const [isBackendReady, setIsBackendReady] = useState(false);

  const checkBackendStatus = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    try {
      console.log(`Checking backend status at ${apiUrl}...`);
      const res = await fetch(`${apiUrl}/health`);
      if (res.ok) {
        setIsBackendReady(true);
        console.log('Backend is ready!');
      } else {
        throw new Error('Backend not ready');
      }
    } catch (e) {
      console.log('Backend check failed:', e);
      setIsBackendReady(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkBackendStatus();

    // Wake up backend mechanism
    const wakeUpBackend = async (retries = 5, delay = 2000) => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      try {
        const res = await fetch(`${apiUrl}/`);
        if (res.ok) {
          setIsBackendReady(true);
          toast.success("Service Ready", {
            description: "Backend services are now active.",
          });
        } else {
          throw new Error('Backend error');
        }
      } catch (e) {
        if (retries > 0) {
          // If it's the first retry (meaning 2nd attempt total), tell the user we are waiting
          if (retries === 4) {
            toast.info("Starting Services...", {
              description: "The backend is waking up. This might take a minute on the first run.",
              duration: 5000,
            });
          }
          console.log(`Backend wake-up retry... (${retries} left)`);
          setTimeout(() => wakeUpBackend(retries - 1, delay * 1.5), delay);
        } else {
          toast.error("Service Unavailable", {
            description: "Could not connect to the backend. scans might fail.",
            duration: 8000,
          });
        }
      }
    };

    wakeUpBackend();
  }, []);

  return (
    <BackendContext.Provider value={{ isBackendReady, checkBackendStatus }}>
      {children}
    </BackendContext.Provider>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BackendProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/history" element={<History />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </BackendProvider>
    </QueryClientProvider>
  );
};
export default App;
