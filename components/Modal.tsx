import React from 'react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

const Modal: React.FC<ModalProps> = ({ 
  title, 
  children, 
  actionLabel, 
  onAction,
  secondaryLabel,
  onSecondary
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] transform animate-[fadeIn_0.3s_ease-out]">
        <h2 className="text-3xl font-tech font-bold text-center bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-6">
          {title}
        </h2>
        <div className="mb-8 text-gray-300 text-center text-lg space-y-4">
          {children}
        </div>
        <div className="flex flex-col gap-3">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-lg shadow-lg shadow-cyan-900/50 transition-all active:scale-95"
            >
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="w-full py-3 px-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;