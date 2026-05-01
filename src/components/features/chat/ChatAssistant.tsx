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
  Languages
} from 'lucide-react';
import { Button } from '../../ui/Button';

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
  { id: '1', title: 'Content Ideas for Tech', lastMessage: 'Here are 5 ideas...', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
  { id: '2', title: 'Modular Learning Systems', lastMessage: 'Explain how these systems...', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: '3', title: 'Growth Strategies 2024', lastMessage: 'I understand, let\'s optimize...', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
];

const suggestions = [
  { icon: Wand2, title: "Content Ideas", prompt: "Give me 5 content ideas for tech creators" },
  { icon: Brain, title: "Explain Topic", prompt: "Explain modular learning systems" },
  { icon: PenTool, title: "Write Post", prompt: "Help me write a viral LinkedIn post" },
  { icon: Languages, title: "Learn Skill", prompt: "Help me learn a new skill quickly" },
];

export const ChatAssistantView = ({ onBack }: { onBack?: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'user',
      content: "Give me content ideas",
      timestamp: new Date(Date.now() - 1000 * 60 * 5)
    },
    {
      id: '2',
      role: 'assistant',
      content: "Here are 5 content ideas for you:\n\n1. **Future of AI**: Share your thoughts on where tech is going.\n2. **Tool Comparison**: Breaking down the best current options.\n3. **Productivity Audit**: How you save 2+ hours per day.\n4. **Failure Analysis**: Lessons from a project that didn't work.\n5. **Minimalist Setup**: Show the essentials of your creative workflow.",
      timestamp: new Date(Date.now() - 1000 * 60 * 4)
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

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've analyzed your request: "${content}". \n\nFocusing on high-leverage activities and modular systems will maximize your output efficiency. Would you like a detailed roadmap?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex h-full w-full bg-sun-bg text-sun-text-main overflow-hidden relative font-sans lg:p-4">
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-sun-surface border border-sun-border rounded-[2rem] p-6 shrink-0 h-full mr-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-2xl bg-sun-primary flex items-center justify-center text-black">
            <Bot size={22} />
          </div>
          <span className="font-display font-black tracking-tighter text-xl text-sun-text-main">AI AGENT</span>
        </div>

        <Button 
          className="w-full flex items-center gap-2 px-4 py-4 bg-sun-text-main/5 border border-sun-border hover:border-sun-primary/50 !rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all mb-8 shadow-sm"
          onClick={() => setMessages([])}
        >
          <Plus size={16} />
          <span>New Session</span>
        </Button>

        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
          <p className="px-3 mb-4 text-[9px] font-black text-sun-text-muted uppercase tracking-[0.3em] opacity-40">Previous Synapses</p>
          {mockSessions.map((session) => (
            <button
              key={session.id}
              className="w-full text-left p-4 rounded-2xl hover:bg-sun-text-main/[0.03] border border-transparent hover:border-sun-border/30 transition-all group"
            >
              <span className="text-[11px] font-bold block truncate text-sun-text-main group-hover:text-sun-primary mb-1">{session.title}</span>
              <p className="text-[10px] text-sun-text-muted truncate font-medium opacity-60 group-hover:opacity-100">{session.lastMessage}</p>
            </button>
          ))}
        </div>

        <div className="mt-auto pt-6 border-t border-sun-border">
          <button className="w-full flex items-center gap-3 p-3 rounded-xl text-sun-text-muted hover:text-sun-text-main hover:bg-sun-text-main/5 transition-all">
            <History size={16} />
            <span className="text-xs font-bold">Protocol History</span>
          </button>
        </div>
      </aside>

      {/* Main Chat Container */}
      <main className="flex-1 flex flex-col h-full relative min-w-0 bg-sun-bg lg:rounded-[2.5rem] lg:border lg:border-sun-border shadow-2xl overflow-hidden">
        
        {/* Header - Mobile First Sticky */}
        <header className="h-16 sm:h-20 flex items-center justify-between px-4 sm:px-8 border-b border-sun-border bg-sun-bg/90 backdrop-blur-3xl z-40 sticky top-0 shrink-0">
          <div className="flex items-center gap-3 sm:gap-5">
             <button 
               onClick={onBack}
               className="p-2 -ml-2 rounded-xl hover:bg-sun-text-main/5 text-sun-text-muted transition-colors sm:hidden"
             >
               <ChevronLeft size={24} />
             </button>
             <div className="flex flex-col">
               <h1 className="text-base sm:text-lg font-bold tracking-tight text-sun-text-main">AI Assistant</h1>
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-sun-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(255,184,0,0.8)]" />
                  <span className="text-[9px] font-black text-sun-text-muted uppercase tracking-[0.2em] whitespace-nowrap">Node Connected</span>
               </div>
             </div>
          </div>

          <div className="flex items-center gap-2">
             <button 
               onClick={() => setMessages([])}
               className="p-2.5 rounded-xl bg-sun-text-main/5 hover:bg-sun-primary hover:text-black transition-all border border-sun-border"
             >
               <Plus size={20} />
             </button>
             <button className="p-2.5 rounded-xl text-sun-text-muted hover:bg-sun-text-main/5 active:scale-95 transition-all">
               <MoreVertical size={20} />
             </button>
          </div>
        </header>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-6 px-4 sm:px-8 lg:px-16 space-y-6 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto text-center py-12 px-4">
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="space-y-6 mb-12"
               >
                 <div className="w-20 h-20 bg-sun-primary/10 rounded-[2.5rem] flex items-center justify-center text-sun-primary mx-auto mb-8 shadow-[0_0_50px_rgba(255,184,0,0.15)] border border-sun-primary/20">
                   <Sparkles size={40} />
                 </div>
                 <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight uppercase italic leading-tight">How can I <span className="text-sun-primary">Help</span> you today?</h2>
                 <p className="text-sun-text-muted text-sm sm:text-lg font-medium leading-relaxed italic opacity-70">
                   "Accelerate your workflow with specialized synthesis."
                 </p>
               </motion.div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  {suggestions.map((item, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      onClick={() => handleSend(item.prompt)}
                      className="group p-5 bg-white/[0.02] border border-white/5 hover:border-sun-primary/30 hover:bg-sun-primary/[0.03] transition-all text-left rounded-3xl active:scale-95 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-sun-text-muted group-hover:bg-sun-primary group-hover:text-black transition-all shrink-0">
                        <item.icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white group-hover:text-sun-primary mb-1">{item.title}</h4>
                        <p className="text-[11px] text-sun-text-muted leading-tight font-medium line-clamp-1 opacity-60">{item.prompt}</p>
                      </div>
                    </motion.button>
                  ))}
               </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex w-full mb-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                   <div className={`
                    max-w-[85%] sm:max-w-[75%] px-5 sm:px-7 py-4 sm:py-5 rounded-[2rem] shadow-xl relative overflow-hidden
                    ${msg.role === 'user' 
                      ? 'bg-sun-primary text-black rounded-tr-none font-bold' 
                      : 'bg-sun-surface border border-sun-border rounded-tl-none text-sun-text-main'}
                  `}>
                    {msg.role === 'assistant' && (
                       <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sun-primary/20 to-transparent" />
                    )}
                    <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <div className={`mt-3 flex items-center gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest opacity-40 ${msg.role === 'user' ? 'text-black/60' : 'text-sun-text-muted'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                   <div className="bg-sun-surface border border-sun-border rounded-[1.75rem] rounded-tl-none px-6 py-4 flex items-center gap-4 shadow-xl">
                      <div className="flex gap-1.5 focus-within:z-10">
                        <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 bg-sun-primary rounded-full shadow-[0_0_8px_rgba(255,184,0,0.5)]" />
                        <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-sun-primary rounded-full shadow-[0_0_8px_rgba(255,184,0,0.5)]" />
                        <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-sun-primary rounded-full shadow-[0_0_8px_rgba(255,184,0,0.5)]" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-sun-primary opacity-80">Synthesizing Logic...</span>
                   </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} className="h-4 shrink-0" />
            </>
          )}
        </div>

        {/* Bottom Input Area */}
        <div className="p-4 sm:p-8 shrink-0 bg-gradient-to-t from-sun-bg via-sun-bg to-transparent sticky bottom-0 z-50">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
             <div className="relative flex items-end gap-2 bg-sun-surface/90 backdrop-blur-3xl border border-sun-border rounded-[2.25rem] sm:rounded-[2.5rem] p-2 pl-5 sm:pl-8 focus-within:border-sun-primary/30 transition-all shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)]">
                <button className="p-3 mb-1.5 text-sun-text-muted hover:text-sun-text-main transition-colors hover:bg-sun-text-main/5 rounded-2xl">
                  <Paperclip size={22} />
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
                  placeholder="Ask me anything..."
                  className="flex-1 bg-transparent py-4 sm:py-5 text-sm sm:text-base font-medium focus:outline-none text-sun-text-main placeholder:text-sun-text-muted/20 max-h-[160px] resize-none overflow-y-auto scrollbar-hide"
                />

                <div className="flex items-center gap-1.5 pr-1.5 pb-1.5">
                   <button className="p-3 rounded-2xl text-sun-text-muted hover:bg-sun-text-main/5 active:scale-95 transition-all">
                      <Mic size={22} />
                   </button>
                   <button 
                     onClick={() => handleSend()}
                     disabled={!input.trim()}
                     className={`
                       w-12 h-12 flex items-center justify-center rounded-[1.5rem] transition-all duration-500
                       ${input.trim() 
                         ? 'bg-sun-primary text-black shadow-lg shadow-sun-primary/20 scale-100 hover:scale-105 active:scale-90' 
                         : 'bg-sun-text-main/5 text-sun-text-muted opacity-30 cursor-not-allowed scale-95'}
                     `}
                   >
                     <ArrowUp strokeWidth={3} size={24} />
                   </button>
                </div>
             </div>
             <p className="text-[9px] text-center font-black text-sun-text-muted uppercase tracking-[0.3em] opacity-30 px-6">
                System: Synapse Pulse v2.0 • Shift+Enter for new line
             </p>
          </div>
        </div>

      </main>
    </div>
  );
};
