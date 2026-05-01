import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, UserX, Info, ChevronRight, Flag, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { BackButton } from '../ui/BackButton';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
}

const Modal = ({ isOpen, onClose, title, children, onBack }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-sun-bg border border-sun-border rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {onBack && <BackButton onClick={onBack} label="" className="!p-0" />}
                  <h3 className="text-xl font-display font-bold">{title}</h3>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-sun-text-muted transition-colors">
                  <X size={20} />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const BlockUserModal = ({ 
  isOpen, 
  onClose, 
  userName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  userName: string 
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Block User">
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/20">
            <UserX size={32} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-sun-text-main">
              Are you sure you want to block <span className="font-bold text-white">@{userName}</span>?
            </p>
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl text-left border border-sun-border/30 mt-4">
               <div className="flex items-start gap-3">
                  <Info size={14} className="text-sun-text-muted shrink-0 mt-0.5" />
                  <p className="text-[10px] text-sun-text-muted font-medium leading-relaxed">They won't be able to find your profile, posts, or reels on the platform.</p>
               </div>
               <div className="flex items-start gap-3">
                  <Info size={14} className="text-sun-text-muted shrink-0 mt-0.5" />
                  <p className="text-[10px] text-sun-text-muted font-medium leading-relaxed">They won't be notified that you blocked them.</p>
               </div>
               <div className="flex items-start gap-3">
                  <AlertCircle size={14} className="text-sun-text-muted shrink-0 mt-0.5" />
                  <p className="text-[10px] text-sun-text-muted font-medium leading-relaxed">Any existing direct message channels will be archived.</p>
               </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button 
            variant="outline" 
            className="w-full !rounded-2xl h-12 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5"
          >
            Block User
          </Button>
          <Button variant="secondary" onClick={onClose} className="w-full !rounded-2xl h-12">Cancel</Button>
        </div>
      </div>
    </Modal>
  );
};

export const DeletePostModal = ({ 
  isOpen, 
  onClose, 
  onDelete 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onDelete: () => void;
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Wisdom Node">
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/20">
            <Flag size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Delete Permanent?</h3>
            <p className="text-sm text-sun-text-muted">
              Removing this post will purge its data from the network. This action cannot be reversed.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button 
            variant="outline" 
            onClick={onDelete}
            className="w-full !rounded-2xl h-12 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
          >
            Delete Node
          </Button>
          <Button variant="secondary" onClick={onClose} className="w-full !rounded-2xl h-12">Cancel</Button>
        </div>
      </div>
    </Modal>
  );
};

export const ReportModal = ({ 
  isOpen, 
  onClose, 
  targetType 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  targetType: 'post' | 'user' | 'comment' 
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  
  const reasons = [
    'Spam or misleading',
    'Hate speech or symbols',
    'Harassment or bullying',
    'Intellectual property violation',
    'Incorrect expertise attribution',
    'Inappropriate knowledge content',
    'Other'
  ];

  const handleReport = () => {
    // Logic for report submission
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Content">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-sun-text-muted ml-1">Why are you reporting this {targetType}?</p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide pr-1">
            {reasons.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`w-full text-left p-4 rounded-2xl border transition-all text-sm font-medium flex items-center justify-between group ${
                  selectedReason === reason 
                  ? 'bg-sun-primary/10 border-sun-primary text-sun-primary' 
                  : 'bg-white/2 border-sun-border/30 text-sun-text-muted hover:border-white/20'
                }`}
              >
                <span>{reason}</span>
                {selectedReason === reason && <ChevronRight size={16} className="animate-in slide-in-from-left-2 duration-300" />}
              </button>
            ))}
          </div>
        </div>

        {selectedReason && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2 pt-2"
          >
             <label className="text-[10px] font-black uppercase tracking-[0.15em] text-sun-text-muted ml-1">Additional Context (Optional)</label>
             <textarea 
               placeholder="Help our moderators understand the issue..."
               className="w-full bg-sun-bg border border-sun-border rounded-2xl p-4 text-xs focus:outline-none focus:ring-2 focus:ring-sun-primary/30 transition-all min-h-[100px] resize-none font-medium placeholder:text-sun-text-muted/50"
             />
          </motion.div>
        )}

        <div className="flex flex-col gap-2">
          <Button 
            disabled={!selectedReason} 
            onClick={handleReport}
            className="w-full !rounded-2xl h-14 shadow-xl shadow-sun-primary/10 disabled:opacity-50 disabled:grayscale"
          >
            Submit Report
          </Button>
          <Button variant="secondary" onClick={onClose} className="w-full !rounded-2xl h-12">Cancel</Button>
        </div>
      </div>
    </Modal>
  );
};
