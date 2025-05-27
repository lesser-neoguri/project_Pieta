'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';
import ErrorMessage from '@/components/ui/ErrorMessage';

type ErrorType = {
  id: string;
  message: string; 
  type: 'info' | 'warning' | 'error' | 'success';
  actionText?: string;
  onAction?: () => void;
};

export const ErrorContext = createContext<{
  errors: ErrorType[];
  addError: (error: Omit<ErrorType, 'id'>) => void;
  removeError: (id: string) => void;
}>({
  errors: [],
  addError: () => {},
  removeError: () => {},
});

export const ErrorProvider = ({ children }: { children: ReactNode }) => {
  const [errors, setErrors] = useState<ErrorType[]>([]);
  
  const addError = (error: Omit<ErrorType, 'id'>) => {
    const id = Date.now().toString();
    setErrors(prev => [...prev, { ...error, id }]);
    
    // 자동 제거 (3초 후)
    if (error.type !== 'error') {
      setTimeout(() => removeError(id), 3000);
    }
  };
  
  const removeError = (id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };
  
  return (
    <ErrorContext.Provider value={{ errors, addError, removeError }}>
      {children}
      <ErrorDisplay />
    </ErrorContext.Provider>
  );
};

// 에러 표시 컴포넌트
const ErrorDisplay = () => {
  const { errors, removeError } = useContext(ErrorContext);
  
  if (errors.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md space-y-2">
      {errors.map(error => (
        <ErrorMessage
          key={error.id}
          message={error.message}
          type={error.type}
          actionText={error.actionText}
          onAction={error.onAction}
          onDismiss={() => removeError(error.id)}
        />
      ))}
    </div>
  );
};

// 사용 편의를 위한 훅
export const useError = () => useContext(ErrorContext); 