import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Wake up backend on load with retry
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const wakeUpBackend = async (retries = 3, delay = 2000) => {
      // Show cold start message immediately if we are in a likely cold-start scenario or just always on first load check
      // The user requested: "while loading the page for the first time... mention the message... backend services is starting"
      // We'll set a timeout to show the toast if it takes more than 1 second to respond, to avoid annoying users with fast backends.
      const toastTimer = setTimeout(() => {
        toast.info("Backend services is starting", {
          description: "It might take some time for the first time.",
          duration: 5000,
        });
      }, 1500);

      try {
        if (import.meta.env.PROD && apiUrl.includes('localhost')) {
          console.error('CRITICAL: Running in production but VITE_API_URL is set to localhost. Backend connection will likely fail.');
        }
        console.log(`Pinging backend at ${apiUrl}...`);
        const res = await fetch(`${apiUrl}/`);
        clearTimeout(toastTimer); // Cancel toast if backend responds quickly
        if (res.ok) {
          console.log('Backend is awake and ready!');
        } else {
          throw new Error('Backend responded with error');
        }
      } catch (e) {
        // If it failed, the toast might have already shown or will show.
        // If we are retrying, we might want to keep showing it?
        // The previous logic just retries silently.
        // We let the toast stay if it appeared.
        console.warn(`Backend wake-up attempt failed. Retries left: ${retries}`);
        if (retries > 0) {
          setTimeout(() => wakeUpBackend(retries - 1, delay * 1.5), delay);
        } else {
          console.error('Backend failed to wake up after multiple attempts.');
          toast.error("Backend unavailable", {
            description: "Please check your connection and try again."
          });
        }
      }
    };

    wakeUpBackend();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
};
export default App;
