import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  ChevronLeft, 
  MoreVertical, 
  Paperclip, 
  Mic, 
  Bot,
  History,
  Sparkles,
  ArrowUp,
  Wand2,
  Brain,
  PenTool,
  BookOpen,
  Code,
  Flame,
  ArrowRight,
  Send,
  CheckCircle,
  Clock,
  Briefcase
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Input';
import { Avatar } from '../../ui/Avatar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

const mockSessions: ChatSession[] = [
  { id: '1', title: 'Rust vs WebAssembly System Web', lastMessage: 'Rust compiles directly to...', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
  { id: '2', title: 'Drafting Spark: CSS Grids', lastMessage: 'A 50-second video flow on...', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: '3', title: 'System Architecture Checklist', lastMessage: 'Ensure you utilize state...', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
];

export const ChatAssistantView = ({ onBack }: { onBack?: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'user',
      content: "Suggest dynamic ideas for a new educational video on system architectural scale.",
      timestamp: new Date(Date.now() - 1000 * 60 * 10)
    },
    {
      id: '2',
      role: 'assistant',
      content: "Hello! Here are 3 highly visual, high-engagement concepts customized for a **Korusa Spark** video:\n\n1. **'The Microservice Maze'**: Render a visual contrast between monolithic network traffic vs a cleanly routed event-driven bus.\n2. **'State Isolation Demystified'**: Explain how to prevent infinite looping inside reactive layouts by storing primitive states.\n3. **'Edge Caching Explained'**: Use a pizza delivery analogy to visually teach how CDN latency acts as a regional warehouse network.",
      timestamp: new Date(Date.now() - 1000 * 60 * 9)
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSend = (text?: string) => {
    const content = text || input;
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // AI custom reply simulations mapping professional Korusa advice
    setTimeout(() => {
      let reply = "";
      if (content.toLowerCase().includes("spark")) {
        reply = "Here is a fast-paced storyboard for your **Korusa Spark** script:\n\n- **0-05s Hook**: Stare directly and say: 'Stop using raw useEffect for API hooks. It is slow.'\n- **05-25s Problem/Fix**: Show side-by-side terminal of race condition error vs clean async controller cleanup.\n- **250-45s Value**: Explain the performance gain.\n- **45-50s Call to Action**: 'Connect with me on Korusa for code copy!'";
      } else if (content.toLowerCase().includes("course") || content.toLowerCase().includes("learn") || content.toLowerCase().includes("explain")) {
        reply = "Understood. Let's break this down into a modular learning path:\n\n1. **First Milestone**: Understand structural immutability.\n2. **Second Milestone**: Master context boundaries and event buses.\n3. **Pragmatic Application**: Build a real-time micro-service prototype next weekend. Let me know if you want the sample code schema!";
      } else {
        reply = `I have context-processed your prompt: "${content}".\n\nFor best results inside the Korusa community network, focus on concise code patterns or design layouts. Let me know how I can detail this further!`;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1100);
  };

  // 1. SUGGESTED PROMPTS CORES
  const SUGGESTED_PROMPTS = [
    { text: "System design masterclass syllabus", action: "Draft a 4-week learning curriculum for high performance micro-services", type: "learn" },
    { text: "Rust vs Go compiler latency guide", action: "Directly contrast Rust and Go compilation scales for cloud applications", type: "tech" },
  ];

  // 2. CONTENT CREATION SHORTCUTS
  const CONTENT_SHORTCUTS = [
    { title: "Draft Spark Script", prompt: "Write an engaging 50-second Spark Script explaining reactive race conditions", icon: <Flame size={14} className="text-sun-primary" /> },
    { title: "Format LinkedIn Post", prompt: "Summarize my cloud system design lessons into a clean professional post", icon: <PenTool size={14} className="text-emerald-500" /> },
    { title: "Write Project Pitch", prompt: "Structure a clear co-building pitch looking for design collaborators", icon: <Briefcase size={14} className="text-indigo-500" /> },
  ];

  return (
    <div className="flex h-full w-full bg-sun-bg text-sun-text-main overflow-hidden relative font-sans lg:p-4">
      
      {/* Dynamic Left Column - Synapse Sessions & shortcuts */}
      <aside className="hidden lg:flex flex-col w-72 bg-sun-surface border border-sun-border rounded-[2rem] p-6 shrink-0 h-full mr-4 space-y-6">
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 rounded-xl bg-sun-primary flex items-center justify-center text-white ring-4 ring-sun-primary/10">
            <Bot size={20} />
          </div>
          <div>
            <span className="font-display font-bold text-base text-sun-text-main block">Korusa Mentor AI</span>
            <span className="text-[9px] text-sun-primary uppercase tracking-widest font-black leading-none">Synthesizer Mode</span>
          </div>
        </div>

        <Button 
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-sun-primary/10 border border-sun-primary/20 text-sun-primary !rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm"
          onClick={() => setMessages([])}
        >
          <Plus size={14} />
          <span>New AI Consultation</span>
        </Button>

        {/* 3. LEARNING ASSISTANCE SPECIALIZED CARDS */}
        <div className="bg-gradient-to-br from-sun-primary/10 to-sun-secondary/10 border border-sun-primary/15 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-sun-primary" />
            <h4 className="text-xs font-bold text-sun-text-main">Learning Assistant</h4>
          </div>
          <p className="text-[11px] text-sun-text-muted leading-relaxed">
            Click any shortcut or describe an advanced concept to receive systematic cheat-sheets, quiz reviews, or storyboards.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
          <p className="px-2 text-[9px] font-black text-sun-text-muted uppercase tracking-[0.2em] opacity-40">Recent consultations</p>
          {mockSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleSend(session.title)}
              className="w-full text-left p-3.5 rounded-xl hover:bg-sun-bg border border-transparent hover:border-sun-border/40 transition-all group"
            >
              <span className="text-[11px] font-bold block truncate text-sun-text-main group-hover:text-sun-primary mb-1">{session.title}</span>
              <p className="text-[10px] text-sun-text-muted truncate font-medium opacity-60">{session.lastMessage}</p>
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-sun-border">
          <div className="flex items-center justify-between text-[11px] text-sun-text-muted px-1">
            <span className="flex items-center gap-1.5"><History size={13} /> Saved Threads</span>
            <span className="font-bold text-sun-primary">Configure</span>
          </div>
        </div>
      </aside>

      {/* Center Chat Core */}
      <main className="flex-1 flex flex-col h-full relative min-w-0 bg-sun-bg lg:rounded-[2.5rem] lg:border lg:border-sun-border shadow-2xl overflow-hidden">
        
        {/* Header */}
        <header className="h-16 sm:h-20 flex items-center justify-between px-6 border-b border-sun-border bg-sun-bg/90 backdrop-blur-3xl z-40 sticky top-0 shrink-0">
          <div className="flex items-center gap-3">
             <button 
               onClick={onBack}
               className="p-2 -ml-2 rounded-xl hover:bg-sun-text-main/5 text-sun-text-muted transition-colors sm:hidden"
             >
               <ChevronLeft size={20} />
             </button>
             <div className="flex flex-col">
               <h1 className="text-sm sm:text-base font-bold text-sun-text-main flex items-center gap-1.5">
                 Korusa AI Co-Pilot
                 <Badge className="bg-sun-primary/10 text-sun-primary border-sun-primary/10 text-[9px] leading-none py-0.5 font-bold">GPT-4o</Badge>
               </h1>
               <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-sun-accent rounded-full animate-pulse" />
                  <span className="text-[8px] sm:text-[9px] font-bold text-sun-text-muted uppercase tracking-widest whitespace-nowrap">Active consultation protocol</span>
               </div>
             </div>
          </div>

          <div className="flex items-center gap-2">
             <button 
               onClick={() => setMessages([])}
               className="p-2 rounded-xl bg-sun-surface border border-sun-border text-sun-text-muted hover:text-sun-primary transition-colors"
               title="Clear Thread"
             >
               <Plus size={16} />
             </button>
             <button className="p-2 rounded-xl text-sun-text-muted hover:bg-sun-text-main/5 transition-all">
               <MoreVertical size={16} />
             </button>
          </div>
        </header>

        {/* Messaging Board Scroll container */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-6 px-4 sm:px-8 lg:px-12 space-y-6 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-grow flex flex-col justify-center max-w-2xl mx-auto w-full py-8 space-y-8">
               
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="text-center space-y-4"
               >
                 <div className="w-16 h-16 bg-gradient-to-br from-sun-primary to-sun-secondary rounded-2xl flex items-center justify-center text-white mx-auto shadow-md shadow-sun-primary/15">
                   <Sparkles size={28} />
                 </div>
                 <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-sun-text-main">What concept are we building today?</h2>
                 <p className="text-sun-text-muted text-xs sm:text-sm font-normal max-w-sm mx-auto leading-relaxed">
                   Ask any question about programming architectures, draft rapid learning paths, or construct storyboards.
                 </p>
               </motion.div>

               {/* A. CONTENT CREATION SHORTCUTS BAR */}
               <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-sun-primary uppercase tracking-[0.15em] text-center sm:text-left">⚡ Content Creation Shortcuts</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   {CONTENT_SHORTCUTS.map((item, idx) => (
                     <button
                       key={idx}
                       onClick={() => handleSend(item.prompt)}
                       className="p-4 bg-sun-surface border border-sun-border hover:border-sun-primary/30 rounded-xl text-left transition-all hover:shadow-premium group active:scale-95 space-y-2 flex flex-col justify-between"
                     >
                       <div className="flex justify-between items-center">
                         <span className="p-1.5 bg-sun-bg rounded-lg">{item.icon}</span>
                         <ArrowRight size={12} className="text-sun-text-muted group-hover:text-sun-primary transition-all" />
                       </div>
                       <div>
                         <h5 className="text-[11px] font-bold text-sun-text-main group-hover:text-sun-primary transition-colors">{item.title}</h5>
                         <p className="text-[9.5px] text-sun-text-muted truncate mt-0.5 line-clamp-1">{item.prompt}</p>
                       </div>
                     </button>
                   ))}
                 </div>
               </div>

               {/* B. SUGGESTED PROMPTS STRIKES */}
               <div className="space-y-2.5">
                 <h4 className="text-[10px] font-black text-sun-text-muted uppercase tracking-[0.15em] text-center sm:text-left">💡 Recommended Learning Solves</h4>
                 <div className="space-y-2">
                   {SUGGESTED_PROMPTS.map((item, idx) => (
                     <button
                       key={idx}
                       onClick={() => handleSend(item.action)}
                       className="w-full p-3.5 bg-sun-surface border border-sun-border hover:border-sun-primary/30 rounded-xl text-left text-xs font-semibold text-sun-text-main hover:text-sun-primary transition-all flex justify-between items-center group active:scale-[0.99]"
                     >
                       <span className="truncate">{item.text}</span>
                       <span className="text-[10px] text-sun-primary font-bold opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 shrink-0 ml-4">
                         Analyze
                         <ArrowRight size={12} />
                       </span>
                     </button>
                   ))}
                 </div>
               </div>

            </div>
          ) : (
            <div className="flex-1 space-y-6">
              <AnimatePresence mode="popLayout">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`
                      max-w-[85%] sm:max-w-[75%] px-5 sm:px-6 py-4 rounded-2xl shadow-sm relative overflow-hidden leading-relaxed text-sm sm:text-base
                      ${msg.role === 'user' 
                        ? 'bg-gradient-to-r from-sun-primary to-sun-secondary text-white rounded-tr-none font-medium' 
                        : 'bg-sun-surface border border-sun-border rounded-tl-none text-sun-text-main'}
                    `}>
                      {msg.role === 'assistant' && (
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sun-accent/15 to-transparent" />
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      
                      <div className={`mt-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${msg.role === 'user' ? 'text-white/60 justify-end' : 'text-sun-text-muted justify-start'}`}>
                        <Clock size={10} />
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-sun-surface border border-sun-border rounded-xl px-5 py-3 flex items-center gap-3">
                    <div className="flex gap-1">
                      <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 bg-sun-accent rounded-full" />
                      <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-sun-accent rounded-full" />
                      <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-sun-accent rounded-full" />
                    </div>
                    <span className="text-[10px] font-bold text-sun-primary">Structuring content suggestions...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} className="h-2 shrink-0" />
            </div>
          )}
        </div>

        {/* Console Input area */}
        <div className="p-4 sm:p-6 shrink-0 bg-gradient-to-t from-sun-bg via-sun-bg to-transparent sticky bottom-0 z-40">
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
             <div className="relative flex items-end gap-2 bg-sun-surface/95 border border-sun-border rounded-2xl p-2 pl-4 focus-within:border-sun-primary/35 transition-all shadow-md">
                <button className="p-2.5 mb-1 text-sun-text-muted hover:text-sun-primary transition-colors hover:bg-sun-bg rounded-lg" title="Attach design asset">
                  <Paperclip size={18} />
                </button>
                
                <textarea 
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Draft system request or ask a skill guide..."
                  className="flex-1 bg-transparent py-3 text-sm focus:outline-none text-sun-text-main placeholder:text-sun-text-muted/30 max-h-[140px] resize-none overflow-y-auto scrollbar-hide"
                />

                <div className="flex items-center gap-1.5 pr-1.5 pb-1">
                   <button className="p-2.5 rounded-lg text-sun-text-muted hover:bg-sun-bg transition-all hidden sm:flex">
                      <Mic size={18} />
                   </button>
                   <button 
                     onClick={() => handleSend()}
                     disabled={!input.trim()}
                     className={`
                       w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-300
                       ${input.trim() 
                         ? 'bg-sun-primary text-white shadow-md shadow-sun-primary/10 scale-100 hover:scale-[1.03] active:scale-95' 
                         : 'bg-sun-text-main/5 text-sun-text-muted opacity-25 cursor-not-allowed scale-95'}
                     `}
                   >
                     <ArrowUp strokeWidth={2.5} size={18} />
                   </button>
                </div>
             </div>
             <p className="text-[8px] text-center font-bold text-sun-text-muted uppercase tracking-[0.25em] opacity-40 px-6">
                Press Enter to consult • Shift+Enter for new line
             </p>
          </div>
        </div>

      </main>
    </div>
  );
};
