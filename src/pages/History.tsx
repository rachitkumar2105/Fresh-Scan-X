import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  History as HistoryIcon, 
  Search, 
  Trash2, 
  Calendar, 
  Tag, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  TrendingDown,
  Scale,
  MessageSquare,
  X,
  Send,
  Loader2,
  Bot,
  Brain
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Scan = {
  id: string;
  created_at: string;
  result: 'fresh' | 'rotten';
  confidence: number;
  fruit_type: string;
  metadata?: any;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Chat State
  const [activeChatScan, setActiveChatScan] = useState<Scan | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (user) {
      fetchScans();
    }
  }, [user]);

  const fetchScans = async () => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScans(data || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteScan = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setScans(scans.filter(scan => scan.id !== id));
      toast({
        title: 'Scan deleted',
        description: 'The scan record has been removed.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete scan record.',
      });
    }
  };

  const startChat = (scan: Scan) => {
    setActiveChatScan(scan);
    setChatMessages([
      { role: 'assistant', content: `Hello! I'm here to help with your ${scan.fruit_type} analysis. You found it was ${scan.result} with ${scan.confidence.toFixed(1)}% confidence. What would you like to know?` }
    ]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !activeChatScan) return;

    const userMsg = inputMessage.trim();
    setInputMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Since we don't have the original image in history, we send metadata
      const formData = new FormData();
      formData.append('fruit', activeChatScan.fruit_type);
      formData.append('freshness', activeChatScan.result);
      formData.append('status', activeChatScan.result === 'fresh' ? 'Safe' : 'Unsafe');
      formData.append('custom_prompt', userMsg);
      // Send a dummy/empty image since the backend expects one but we are in history mode
      formData.append('image_data', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');

      const response = await fetch(`${apiUrl}/explain`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.explanation || "I'm sorry, I couldn't process that." }]);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Chat Error', description: 'Could not connect to AI engine.' });
    } finally {
      setIsTyping(false);
    }
  };

  const filteredScans = scans.filter(scan => 
    scan.fruit_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scan.result.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Analytics Calculation
  const totalScans = scans.length;
  const freshCount = scans.filter(s => s.result === 'fresh').length;
  const rottenCount = scans.filter(s => s.result === 'rotten').length;
  const wastePercentage = totalScans > 0 ? (rottenCount / totalScans) * 100 : 0;
  const avgConfidence = totalScans > 0 ? scans.reduce((acc, s) => acc + s.confidence, 0) / totalScans : 0;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20 relative">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight flex items-center justify-center md:justify-start gap-3 uppercase">
              <HistoryIcon className="h-8 w-8 text-primary" />
              Intelligence History
            </h1>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
              Waste Analytics & Smart AI Assistance
            </p>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search history..."
              className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Waste Analytics Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <Card variant="glass" className="border-primary/10 overflow-hidden">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Scans</p>
                <div className="p-1.5 bg-primary/10 rounded-lg"><BarChart3 className="h-4 w-4 text-primary" /></div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black">{totalScans}</h3>
                <p className="text-[9px] text-primary font-bold mt-1 uppercase flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" /> Industry Standard
                </p>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="border-destructive/10 overflow-hidden">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Waste Ratio</p>
                <div className="p-1.5 bg-destructive/10 rounded-lg"><TrendingDown className="h-4 w-4 text-destructive" /></div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black">{wastePercentage.toFixed(1)}%</h3>
                <p className="text-[9px] text-destructive font-bold mt-1 uppercase flex items-center gap-1">
                  {wastePercentage > 20 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />} 
                  {wastePercentage > 20 ? 'Action Required' : 'Optimal Zone'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="border-warning/10 overflow-hidden">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Confidence Avg</p>
                <div className="p-1.5 bg-warning/10 rounded-lg"><Zap className="h-4 w-4 text-warning" /></div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black">{avgConfidence.toFixed(0)}%</h3>
                <p className="text-[9px] text-warning font-bold mt-1 uppercase">Inference Quality</p>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="border-primary/10 overflow-hidden">
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Inventory</p>
                <div className="p-1.5 bg-primary/10 rounded-lg"><Scale className="h-4 w-4 text-primary" /></div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-black">{freshCount}</h3>
                <p className="text-[9px] text-primary font-bold mt-1 uppercase">Items Fresh</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <Card variant="glass" className="border-border/50 rounded-3xl overflow-hidden animate-slide-up">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border/50">
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Item</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Confidence</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detected On</th>
                    <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground font-bold animate-pulse uppercase tracking-widest text-xs">
                        Loading Intelligence Logs...
                      </td>
                    </tr>
                  ) : filteredScans.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
                        No scan history found.
                      </td>
                    </tr>
                  ) : (
                    filteredScans.map((scan) => (
                      <tr key={scan.id} className="group hover:bg-primary/5 transition-all">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-secondary rounded-lg font-bold text-sm uppercase tracking-tight">
                              {scan.fruit_type}
                            </div>
                            {scan.metadata?.mode && (
                              <span className="text-[8px] px-1.5 py-0.5 bg-muted rounded font-bold uppercase text-muted-foreground">
                                {scan.metadata.mode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            scan.result === 'fresh' 
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}>
                            {scan.result === 'fresh' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {scan.result}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-sm">
                          {scan.confidence.toFixed(1)}%
                        </td>
                        <td className="p-4 text-xs text-muted-foreground font-medium">
                          {format(new Date(scan.created_at), 'MMM d, yyyy · h:mm a')}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startChat(scan)}
                              className="text-primary hover:bg-primary/10 rounded-xl gap-2 text-[10px] font-bold uppercase"
                            >
                              <MessageSquare className="h-4 w-4" /> Chat
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteScan(scan.id)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* AI Chat Drawer / Modal */}
        {activeChatScan && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
            <Card className="w-full max-w-lg h-[80vh] md:h-[600px] flex flex-col border-2 border-primary/20 shadow-2xl rounded-3xl animate-slide-up">
              <CardHeader className="p-4 border-b border-border/50 flex flex-row items-center justify-between bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest">{activeChatScan.fruit_type} Analysis</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold">Smart Assistant</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveChatScan(null)} className="rounded-full h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex gap-3 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}>
                    <div className={cn(
                      "p-2 rounded-lg shrink-0 h-8 w-8 flex items-center justify-center",
                      msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
                    )}>
                      {msg.role === 'user' ? <Zap className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={cn(
                      "p-3 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border/50 rounded-tl-none shadow-sm"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="p-2 rounded-lg bg-secondary text-primary shrink-0 h-8 w-8 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                    <div className="bg-card border border-border/50 p-3 rounded-2xl rounded-tl-none italic text-muted-foreground text-xs">
                      Assistant is typing...
                    </div>
                  </div>
                )}
              </CardContent>

              <div className="p-4 border-t border-border/50 bg-background">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                  <input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about freshness, recipes, or safety..."
                    className="flex-1 px-4 py-2 bg-secondary/50 border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                  <Button type="submit" disabled={!inputMessage.trim() || isTyping} variant="glow" size="icon" className="rounded-xl h-10 w-10">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <p className="text-[8px] text-center mt-3 text-muted-foreground font-bold uppercase tracking-widest">
                  Powered by FreshScanX Groq Intelligence
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
