import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Leaf, Camera, Upload, History, Shield, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      
      {/* Navigation */}
      <header className="relative z-10 p-6">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 group">
            <div className="relative">
              <Leaf className="h-8 w-8 text-primary animate-float" />
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full opacity-50" />
            </div>
            <span className="text-xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Fresh ScanX
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Button asChild variant="glow">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild variant="glow">
                  <Link to="/auth">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Zap className="h-4 w-4" />
            AI-Powered Freshness Detection
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight">
            <span className="text-foreground">Scan Your</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
              Produce Freshness
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
            Instantly detect if your fruits and vegetables are fresh or rotten using advanced AI. 
            Just snap a photo or upload an image to get started.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild variant="glow" size="xl">
              <Link to={user ? '/dashboard' : '/auth'}>
                Start Scanning
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="glass" size="xl">
              <Link to={user ? '/history' : '/auth'}>
                View History
              </Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32 grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Camera,
              title: 'Camera Scan',
              description: 'Use your device camera to capture and analyze produce in real-time.',
              delay: 'stagger-1'
            },
            {
              icon: Upload,
              title: 'Upload Image',
              description: 'Upload existing photos from your gallery for instant freshness analysis.',
              delay: 'stagger-2'
            },
            {
              icon: History,
              title: 'Scan History',
              description: 'Keep track of all your scans with detailed results and timestamps.',
              delay: 'stagger-3'
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className={`group p-8 rounded-2xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/50 hover:shadow-[0_0_30px_hsl(142_76%_45%/0.1)] transition-all duration-500 animate-slide-up opacity-0 ${feature.delay}`}
              style={{ animationFillMode: 'forwards' }}
            >
              <div className="relative inline-flex p-4 rounded-xl bg-primary/10 text-primary mb-6">
                <feature.icon className="h-8 w-8" />
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Trust badge */}
        <div className="mt-24 text-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card/50 backdrop-blur-sm border border-border">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              Secure • Private • Fast Analysis
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
