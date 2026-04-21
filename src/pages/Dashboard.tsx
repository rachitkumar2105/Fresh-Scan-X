import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { useBackend } from '@/App';
import {
  Camera,
  Upload,
  Scan,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
  Leaf,
  Brain,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MessageSquare,
  ChevronRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ScanResult = {
  fruit: string;
  freshness: string;
  confidence: number;
  status: 'Safe' | 'Caution' | 'Unsafe' | 'Not Sure';
  consumption_window: string;
  risk_level: 'Low' | 'Medium' | 'High';
  message: string;
  error?: string;
};

export default function Dashboard() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [askingLLM, setAskingLLM] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isBackendReady } = useBackend();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid File',
          description: 'Please upload an image file.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
        setScanResult(null);
        setExplanation(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const performScan = async () => {
    if (!capturedImage || !user) return;

    setScanning(true);
    setExplanation(null);

    try {
      let blob;
      if (capturedImage.startsWith('data:')) {
        const response = await fetch(capturedImage);
        blob = await response.blob();
      } else {
        throw new Error("Invalid image data");
      }

      const formData = new FormData();
      formData.append('file', blob, 'scan.jpg');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${apiUrl}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: data.error,
        });
        setScanning(false);
        return;
      }

      setScanResult(data);

      try {
        await supabase.from('scans').insert({
          user_id: user.id,
          result: data.freshness.toLowerCase(),
          confidence: data.confidence,
          fruit_type: data.fruit,
        });
      } catch (error) {
        console.error('Failed to save scan:', error);
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed.';
      toast({
        variant: 'destructive',
        title: 'Scan Failed',
        description: errorMessage,
      });
    } finally {
      setScanning(false);
    }
  };

  const getAIExplanation = async () => {
    if (!capturedImage || !scanResult) return;
    
    setAskingLLM(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const apiKey = localStorage.getItem('groq_api_key');
      
      const formData = new FormData();
      formData.append('image_data', capturedImage);
      formData.append('fruit', scanResult.fruit);
      formData.append('freshness', scanResult.freshness);
      formData.append('status', scanResult.status);
      if (apiKey) formData.append('api_key', apiKey);

      const response = await fetch(`${apiUrl}/explain`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'AI Analysis Failed',
        description: 'Could not connect to LLM engine.',
      });
    } finally {
      setAskingLLM(false);
    }
  };

  const resetScan = () => {
    setCapturedImage(null);
    setScanResult(null);
    setExplanation(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (nativeInputRef.current) nativeInputRef.current.value = '';
  };

  const getStatusConfig = () => {
    if (!scanResult) return null;
    switch (scanResult.status) {
      case 'Safe':
        return { 
          icon: <CheckCircle className="h-10 w-10 md:h-12 md:w-12 text-primary" />, 
          color: 'text-primary border-primary/30 bg-primary/5',
          glow: 'shadow-[0_0_20px_hsl(142_76%_45%/0.2)]',
          badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        };
      case 'Unsafe':
        return { 
          icon: <XCircle className="h-10 w-10 md:h-12 md:w-12 text-destructive" />, 
          color: 'text-destructive border-destructive/30 bg-destructive/5',
          glow: 'shadow-[0_0_20px_hsl(0_72%_51%/0.2)]',
          badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        };
      case 'Caution':
        return { 
          icon: <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-warning" />, 
          color: 'text-warning border-warning/30 bg-warning/5',
          glow: 'shadow-[0_0_20px_hsl(38_92%_50%/0.2)]',
          badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        };
      default:
        return { 
          icon: <Info className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />, 
          color: 'text-muted-foreground border-border bg-muted/5',
          glow: '',
          badge: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        <div className="text-center space-y-2 md:space-y-3 animate-fade-in">
          <h1 className="text-2xl md:text-4xl font-display font-black tracking-tight flex items-center justify-center gap-3 md:gap-4">
            <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg md:rounded-xl">
              <Leaf className="h-6 w-6 md:h-10 md:w-10 text-primary animate-pulse-slow" />
            </div>
            <span className="gradient-text">FRESH SCAN X</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg max-w-lg mx-auto px-4">
            Professional AI food freshness detection with real-time decision support
          </p>
        </div>

        {!isBackendReady && (
          <div className="bg-primary/10 border border-primary/20 backdrop-blur-md px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl flex items-center justify-center gap-3 animate-pulse mx-4">
            <Loader2 className="h-4 w-4 md:h-5 md:w-5 text-primary animate-spin" />
            <span className="text-primary font-semibold text-xs md:text-base">Initializing AI Inference Engine...</span>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8 items-start px-2 md:px-0">
          {/* Left Side: Scan & Preview */}
          <div className="space-y-4 md:space-y-6">
            <Card variant="glass" className="overflow-hidden border-2 border-primary/10 group rounded-2xl md:rounded-3xl">
              <CardContent className="p-2 md:p-4">
                <div className="relative aspect-[4/3] md:aspect-square lg:aspect-[4/3] bg-secondary/30 rounded-xl md:rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-primary/5 transition-all group-hover:border-primary/20">
                  {capturedImage ? (
                    <>
                      <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </>
                  ) : (
                    <div className="text-center space-y-3 md:space-y-4">
                      <div className="w-16 h-16 md:w-24 md:h-24 mx-auto rounded-2xl md:rounded-3xl bg-primary/10 flex items-center justify-center shadow-inner">
                        <Camera className="h-8 w-8 md:h-12 md:w-12 text-primary/60" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-lg md:text-xl">Ready to Scan</p>
                        <p className="text-muted-foreground text-[10px] md:text-sm px-4">Upload or capture an item to analyze</p>
                      </div>
                    </div>
                  )}

                  {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-md z-20 overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-primary animate-scan z-30 shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
                      <div className="text-center space-y-4 md:space-y-6">
                        <div className="relative">
                          <div className="w-16 h-16 md:w-24 md:h-24 border-4 border-primary/30 rounded-full animate-ping absolute inset-0" />
                          <div className="w-16 h-16 md:w-24 md:h-24 border-4 border-primary rounded-full flex items-center justify-center bg-primary/10">
                            <Brain className="h-8 w-8 md:h-12 md:w-12 text-primary animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-1 md:space-y-2">
                          <p className="text-primary text-base md:text-xl font-display font-bold uppercase tracking-widest">ANALYZING...</p>
                          <p className="text-muted-foreground text-[10px] md:text-xs uppercase tracking-widest animate-pulse">Running Neural Inference</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => nativeInputRef.current?.click()}
                disabled={scanning}
                className="h-16 md:h-20 rounded-xl md:rounded-2xl border-2 hover:border-primary/50 hover:bg-primary/5 transition-all gap-2 md:gap-3"
              >
                <Camera className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                <div className="text-left">
                  <div className="font-bold text-sm md:text-base">Camera</div>
                  <div className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-wider">Live Capture</div>
                </div>
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                className="h-16 md:h-20 rounded-xl md:rounded-2xl border-2 hover:border-primary/50 hover:bg-primary/5 transition-all gap-2 md:gap-3"
              >
                <Upload className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                <div className="text-left">
                  <div className="font-bold text-sm md:text-base">Upload</div>
                  <div className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-wider">Gallery</div>
                </div>
              </Button>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <input ref={nativeInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />

              {capturedImage && (
                <div className="col-span-2 flex gap-3 md:gap-4">
                  {!scanResult ? (
                    <Button
                      variant="glow"
                      size="lg"
                      onClick={performScan}
                      disabled={scanning || !isBackendReady}
                      className="flex-1 h-16 md:h-20 rounded-xl md:rounded-2xl text-lg md:text-xl font-display font-bold tracking-tight gap-3 md:gap-4"
                    >
                      <Scan className="h-6 w-6 md:h-8 md:w-8" />
                      SCAN NOW
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={resetScan}
                      className="flex-1 h-16 md:h-20 rounded-xl md:rounded-2xl border-2 hover:bg-secondary/50 gap-3 md:gap-4"
                    >
                      <RotateCcw className="h-6 w-6 md:h-8 md:w-8" />
                      RESET SYSTEM
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Analysis Results */}
          <div className="space-y-4 md:space-y-6 pb-4">
            {!scanResult && !scanning && (
              <Card className="hidden lg:flex h-full border-2 border-dashed border-muted items-center justify-center p-12 text-center bg-muted/5 rounded-3xl">
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-muted/20 flex items-center justify-center">
                    <Scan className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-xl text-muted-foreground">Waiting for Scan</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">Analysis results will appear here after scanning the item.</p>
                  </div>
                </div>
              </Card>
            )}

            {scanResult && !scanning && (
              <div className="space-y-4 md:space-y-6 animate-scale-in">
                {/* Main Result Card */}
                <Card className={cn("overflow-hidden border-2 transition-all duration-500 rounded-2xl md:rounded-3xl", statusConfig?.color, statusConfig?.glow)}>
                  <CardHeader className="pb-1 md:pb-2 p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div className={cn("px-3 py-0.5 md:px-4 md:py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-sm", statusConfig?.badge)}>
                        {scanResult.status}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground text-[10px] md:text-xs">
                        <Clock className="h-3 w-3" />
                        Just now
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 md:space-y-6 p-4 md:p-8 pt-0 md:pt-2">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-background shadow-lg animate-float">
                        {statusConfig?.icon}
                      </div>
                      <div className="space-y-0.5 md:space-y-1">
                        <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight leading-none uppercase">
                          {scanResult.freshness}
                        </h2>
                        <p className="text-muted-foreground text-xs md:text-base font-medium flex items-center gap-2">
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary animate-pulse" />
                          Industry Grade Analysis
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="p-3 md:p-4 rounded-xl bg-background/40 border border-current/10">
                        <div className="text-[8px] md:text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Confidence</div>
                        <div className="text-xl md:text-2xl font-black">{scanResult.confidence.toFixed(1)}%</div>
                        <div className="w-full bg-muted h-1 md:h-1.5 rounded-full mt-2 overflow-hidden">
                          <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${scanResult.confidence}%` }} />
                        </div>
                      </div>
                      <div className="p-3 md:p-4 rounded-xl bg-background/40 border border-current/10">
                        <div className="text-[8px] md:text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Risk Level</div>
                        <div className={cn("text-xl md:text-2xl font-black", scanResult.risk_level === 'High' ? 'text-destructive' : 'text-primary')}>
                          {scanResult.risk_level}
                        </div>
                        <div className="flex gap-1 mt-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className={cn("h-1 md:h-1.5 flex-1 rounded-full", 
                              i <= (scanResult.risk_level === 'High' ? 3 : scanResult.risk_level === 'Medium' ? 2 : 1) 
                              ? (scanResult.risk_level === 'High' ? 'bg-destructive' : 'bg-primary') 
                              : 'bg-muted'
                            )} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 md:p-4 rounded-xl bg-background/40 border border-current/10 flex items-start gap-3 md:gap-4">
                      <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg shrink-0">
                        <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-[8px] md:text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Recommendation</div>
                        <p className="font-bold text-xs md:text-sm mt-0.5 md:mt-1">{scanResult.consumption_window}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Intelligent Explanation Section */}
                {!explanation && (
                  <Button
                    onClick={getAIExplanation}
                    disabled={askingLLM}
                    variant="outline"
                    className="w-full h-14 md:h-16 rounded-xl md:rounded-2xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all gap-3"
                  >
                    {askingLLM ? (
                      <>
                        <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin text-primary" />
                        <span className="font-bold text-sm md:text-base">Consulting Groq AI...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                        <div className="text-left">
                          <div className="font-bold text-sm md:text-base">Why is it {scanResult.freshness.toLowerCase()}?</div>
                          <div className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-wider">Get AI-Powered Reasoning</div>
                        </div>
                        <ChevronRight className="h-4 w-4 ml-auto text-primary" />
                      </>
                    )}
                  </Button>
                )}

                {explanation && (
                  <Card className="border-2 border-primary/20 bg-primary/5 overflow-hidden animate-scale-in rounded-2xl md:rounded-3xl">
                    <CardHeader className="bg-primary/10 border-b border-primary/10 py-2 md:py-3 px-4 md:px-6">
                      <div className="flex items-center gap-2 md:gap-3">
                        <Brain className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                        <CardTitle className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Groq Intelligent Insights</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-8">
                      <div className="prose prose-invert prose-xs md:prose-sm max-w-none">
                        <div className="text-foreground/90 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                          {explanation}
                        </div>
                      </div>
                      <div className="mt-4 md:mt-8 pt-3 md:pt-4 border-t border-primary/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[8px] md:text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          <ShieldCheck className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                          Safety Validated
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 md:h-8 text-[10px] md:text-xs gap-1.5 md:gap-2 hover:bg-primary/10"
                          onClick={() => setExplanation(null)}
                        >
                          <RotateCcw className="h-2.5 w-2.5 md:h-3 md:w-3" />
                          Reset
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
