import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';
import { Button } from '../ui/Button';

export const PlaceholderView = ({ title }: { title: string }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-sun-bg p-8 flex flex-col items-center justify-center text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md space-y-8"
      >
        <div className="space-y-4">
          <div className="w-20 h-20 bg-sun-surface-light border border-sun-border rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl">
             <div className="w-12 h-12 bg-sun-primary/10 rounded-2xl flex items-center justify-center text-sun-primary animate-pulse">
                <Home size={24} />
             </div>
          </div>
          <h1 className="text-4xl font-display font-black text-sun-text-main uppercase tracking-tighter">{title}</h1>
          <p className="text-sun-text-muted font-medium leading-relaxed">
            This section of the Korusa ecosystem is currently being synchronized. We're building something extraordinary here.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Button 
            variant="outline" 
            className="px-8"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft size={18} />
            Go Back
          </Button>
          <Button 
            variant="primary" 
            className="px-8"
            onClick={() => navigate('/home')}
          >
            <Home size={18} />
            Return Home
          </Button>
        </div>

        <div className="w-12 h-1 bg-sun-primary mx-auto rounded-full mt-12 opacity-30" />
      </motion.div>
    </div>
  );
};
