import React, { useState, useRef, useEffect } from 'react';
import { TextBlockData } from '@/types/blockTypes';

interface TextBlockProps {
  data: TextBlockData;
  isEditing: boolean;
  isSelected: boolean;
  onUpdate: (updates: Partial<TextBlockData>) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
}

export const TextBlock: React.FC<TextBlockProps> = ({
  data,
  isEditing,
  isSelected,
  onUpdate,
  onEditStart,
  onEditEnd
}) => {
  const [localContent, setLocalContent] = useState(data.text_content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  // 편집 모드 진입 시 포커스
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  // 자동 높이 조절
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleContentChange = (value: string) => {
    setLocalContent(value);
    adjustTextareaHeight();
  };

  const handleBlur = () => {
    onUpdate({ text_content: localContent });
    onEditEnd();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setLocalContent(data.text_content); // 변경사항 취소
      onEditEnd();
    }
  };

  // 텍스트 스타일 계산
  const getTextStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      color: data.text_color,
      textAlign: data.text_alignment as any,
      fontWeight: data.text_weight === 'bold' ? 'bold' : 
                 data.text_weight === 'semibold' ? '600' :
                 data.text_weight === 'medium' ? '500' : 'normal',
      lineHeight: data.line_height === 'tight' ? '1.25' :
                  data.line_height === 'relaxed' ? '1.75' :
                  data.line_height === 'loose' ? '2' : '1.5'
    };

    // 텍스트 크기
    switch (data.text_size) {
      case 'small': baseStyles.fontSize = '0.875rem'; break;
      case 'large': baseStyles.fontSize = '1.25rem'; break;
      case 'xl': baseStyles.fontSize = '1.5rem'; break;
      case 'xxl': baseStyles.fontSize = '2rem'; break;
      default: baseStyles.fontSize = '1rem'; break;
    }

    return baseStyles;
  };

  // 컨테이너 스타일
  const getContainerStyles = (): string => {
    const paddingClass = `p-${data.padding === 'none' ? '0' : 
                           data.padding === 'small' ? '2' :
                           data.padding === 'large' ? '8' : '4'}`;
    
    const maxWidthClass = data.max_width === 'small' ? 'max-w-md' :
                         data.max_width === 'large' ? 'max-w-4xl' :
                         data.max_width === 'full' ? 'max-w-full' : 'max-w-2xl';

    return `${paddingClass} ${maxWidthClass} mx-auto`;
  };

  if (isEditing) {
    return (
      <div className={getContainerStyles()}>
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={(e) => handleContentChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={getTextStyles()}
          className="w-full bg-transparent border-none outline-none resize-none overflow-hidden"
          placeholder="텍스트를 입력하세요..."
        />
      </div>
    );
  }

  return (
    <div 
      className={`${getContainerStyles()} cursor-text`}
      onClick={onEditStart}
      ref={divRef}
    >
      <div style={getTextStyles()}>
        {data.text_content || (
          <span className="text-gray-400 italic">
            텍스트를 입력하려면 클릭하세요
          </span>
        )}
      </div>
    </div>
  );
};

// 빠른 설정 컨트롤들
export const TextBlockControls: React.FC<{
  data: TextBlockData;
  onUpdate: (updates: Partial<TextBlockData>) => void;
}> = ({ data, onUpdate }) => (
  <div className="space-y-3">
    {/* 텍스트 크기 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">크기</label>
      <select
        value={data.text_size}
        onChange={(e) => onUpdate({ 
          text_size: e.target.value as TextBlockData['text_size']
        })}
        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
      >
        <option value="small">작게</option>
        <option value="medium">보통</option>
        <option value="large">크게</option>
        <option value="xl">매우 크게</option>
        <option value="xxl">가장 크게</option>
      </select>
    </div>

    {/* 텍스트 정렬 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">정렬</label>
      <div className="flex space-x-1">
        {(['left', 'center', 'right'] as const).map((align) => (
          <button
            key={align}
            onClick={() => onUpdate({ text_alignment: align })}
            className={`px-2 py-1 text-xs rounded ${
              data.text_alignment === align 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {align === 'left' ? '왼쪽' : align === 'center' ? '가운데' : '오른쪽'}
          </button>
        ))}
      </div>
    </div>

    {/* 글자 굵기 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">굵기</label>
      <select
        value={data.text_weight}
        onChange={(e) => onUpdate({ 
          text_weight: e.target.value as TextBlockData['text_weight']
        })}
        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
      >
        <option value="normal">보통</option>
        <option value="medium">중간</option>
        <option value="semibold">진하게</option>
        <option value="bold">굵게</option>
      </select>
    </div>

    {/* 텍스트 색상 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">색상</label>
      <input
        type="color"
        value={data.text_color}
        onChange={(e) => onUpdate({ text_color: e.target.value })}
        className="w-full h-8 border border-gray-300 rounded"
      />
    </div>
  </div>
); 