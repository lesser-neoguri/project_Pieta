import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextBlock } from '@/types/blockTypes';

interface InlineTextEditorProps {
  block: TextBlock;
  onUpdate: (content: string) => void;
  onBlur: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  isEditing: boolean;
  enableMarkdown?: boolean;
}

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  block,
  onUpdate,
  onBlur,
  placeholder = "텍스트를 입력하세요...",
  autoFocus = false,
  isEditing,
  enableMarkdown = false
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Tiptap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 마크다운 지원 여부에 따라 활성화
        bold: enableMarkdown ? {} : false,
        italic: enableMarkdown ? {} : false,
        strike: enableMarkdown ? {} : false,
        heading: enableMarkdown ? {} : false,
        bulletList: enableMarkdown ? {} : false,
        orderedList: enableMarkdown ? {} : false,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: block.data.text_content,
    editable: isEditing,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      onUpdate(content);
    },
    onBlur: () => {
      onBlur();
    },
    onCreate: () => {
      setIsInitialized(true);
    },
  });

  // 편집 모드 변경 시 에디터 상태 업데이트
  useEffect(() => {
    if (editor && isInitialized) {
      editor.setEditable(isEditing);
      
      if (isEditing && autoFocus) {
        // 에디터에 포커스 및 커서를 끝으로 이동
        setTimeout(() => {
          editor.commands.focus('end');
        }, 100);
      }
    }
  }, [isEditing, editor, isInitialized, autoFocus]);

  // 블록 데이터 변경 시 에디터 콘텐츠 동기화
  useEffect(() => {
    if (editor && editor.getHTML() !== block.data.text_content) {
      editor.commands.setContent(block.data.text_content);
    }
  }, [block.data.text_content, editor]);

  // 키보드 단축키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditing || !editor) return;

      // Enter 키로 편집 완료 (Shift+Enter는 줄바꿈)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onBlur();
        return;
      }

      // Escape 키로 편집 취소
      if (e.key === 'Escape') {
        e.preventDefault();
        onBlur();
        return;
      }

      // 마크다운 단축키 (활성화된 경우)
      if (enableMarkdown) {
        // Ctrl/Cmd + B = 굵게
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
          e.preventDefault();
          editor.chain().focus().toggleBold().run();
        }
        
        // Ctrl/Cmd + I = 기울임
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
          e.preventDefault();
          editor.chain().focus().toggleItalic().run();
        }
      }
    };

    if (isEditing) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEditing, editor, enableMarkdown, onBlur]);

  if (!isEditing) {
    // 읽기 모드: 일반 텍스트 또는 렌더링된 HTML 표시
    return (
      <div 
        className={`
          inline-text-display cursor-pointer
          ${getTextSizeClass(block.data.text_size)}
          ${getAlignmentClass(block.data.text_alignment)}
          ${getFontWeightClass(block.data.font_weight)}
          ${getLineHeightClass(block.data.line_height)}
        `}
        style={{
          color: block.data.text_color,
          backgroundColor: block.data.background_color,
        }}
        dangerouslySetInnerHTML={{ 
          __html: block.data.text_content || placeholder 
        }}
      />
    );
  }

  return (
    <div 
      ref={editorRef}
      className={`
        inline-text-editor
        ${getTextSizeClass(block.data.text_size)}
        ${getAlignmentClass(block.data.text_alignment)}
        ${getFontWeightClass(block.data.font_weight)}
        ${getLineHeightClass(block.data.line_height)}
      `}
      style={{
        color: block.data.text_color,
        backgroundColor: block.data.background_color,
      }}
    >
      <EditorContent 
        editor={editor} 
        className="prose prose-sm max-w-none focus:outline-none"
      />
      
      {/* 편집 모드 표시 */}
      {isEditing && (
        <div className="absolute -top-8 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded">
          편집 중... (Enter: 완료, Esc: 취소)
        </div>
      )}
    </div>
  );
};

// 스타일 헬퍼 함수들
function getTextSizeClass(size: string): string {
  const sizeMap: Record<string, string> = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    xl: 'text-xl',
    xxl: 'text-2xl'
  };
  return sizeMap[size] || 'text-base';
}

function getAlignmentClass(alignment: string): string {
  const alignMap: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify'
  };
  return alignMap[alignment] || 'text-center';
}

function getFontWeightClass(weight: string): string {
  const weightMap: Record<string, string> = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };
  return weightMap[weight] || 'font-normal';
}

function getLineHeightClass(height: string): string {
  const heightMap: Record<string, string> = {
    tight: 'leading-tight',
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    loose: 'leading-loose'
  };
  return heightMap[height] || 'leading-normal';
}

// 더블클릭으로 편집 모드 진입을 위한 래퍼 컴포넌트
export const ClickToEditText: React.FC<{
  block: TextBlock;
  onUpdate: (updates: Partial<TextBlock>) => void;
  placeholder?: string;
}> = ({ block, onUpdate, placeholder }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdate = (content: string) => {
    onUpdate({
      data: { ...block.data, text_content: content }
    });
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  return (
    <div 
      onDoubleClick={handleDoubleClick}
      className={`relative ${isEditing ? '' : 'hover:bg-gray-50 rounded'}`}
    >
      <InlineTextEditor
        block={block}
        onUpdate={handleUpdate}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoFocus={true}
        isEditing={isEditing}
        enableMarkdown={block.data.enable_markdown}
      />
    </div>
  );
}; 