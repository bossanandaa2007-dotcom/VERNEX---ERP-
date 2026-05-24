import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[999] bg-slate-900/40"
          />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed left-1/2 top-1/2 z-[1000] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded border border-slate-200 bg-white shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/60 p-5">
              <h3 className="text-lg font-bold tracking-tight text-slate-900">{title}</h3>
              <button 
                onClick={onClose}
                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
