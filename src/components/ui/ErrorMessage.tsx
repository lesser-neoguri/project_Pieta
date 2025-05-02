import React from 'react';

type ErrorMessageProps = {
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  actionText?: string;
  onAction?: () => void;
  onDismiss?: () => void;
};

export default function ErrorMessage({ 
  message, 
  type = 'error',
  actionText,
  onAction,
  onDismiss
}: ErrorMessageProps) {
  // 각 타입별 스타일
  const styles = {
    info: 'bg-blue-100 text-blue-800 border-blue-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    error: 'bg-red-100 text-red-800 border-red-300',
    success: 'bg-green-100 text-green-800 border-green-300'
  };
  
  return (
    <div className={`p-4 mb-4 rounded border ${styles[type]} flex justify-between items-center`}>
      <div className="flex-1">{message}</div>
      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="ml-4 px-3 py-1 text-sm font-medium rounded bg-white"
        >
          {actionText}
        </button>
      )}
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="ml-2 text-gray-500"
        >
          ✕
        </button>
      )}
    </div>
  );
} 