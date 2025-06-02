import React, { useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import { TextBlockData } from '@/types/blockTypes';

interface TiptapTextBlockProps {
  data: TextBlockData;
  isEditing: boolean;
  isSelected: boolean;
  onUpdate: (updates: Partial<TextBlockData>) => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onFocus?: () => void;
  placeholder?: string;
}

export const TiptapTextBlock: React.FC<TiptapTextBlockProps> = ({
  data,
  isEditing,
  isSelected,
  onUpdate,
  onEditStart,
  onEditEnd,
  onFocus,
  placeholder = "텍스트를 입력하세요..."
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 헤딩, 볼드, 이탤릭 등 기본 기능
        heading: {
          levels: [1, 2, 3, 4]
        },
        // 블록 레벨 요소들 비활성화 (다른 블록과 충돌 방지)
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false
      }),
      Placeholder.configure({
        placeholder: placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: data.text_alignment || 'left'
      })
    ],
    content: data.text_content || '',
    editable: isEditing,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      onUpdate({ text_content: content });
    },
    onFocus: () => {
      onFocus?.();
      if (!isEditing) {
        onEditStart();
      }
    },
    onBlur: () => {
      setTimeout(() => {
        if (isEditing) {
          onEditEnd();
        }
      }, 150); // BubbleMenu 클릭을 위한 딜레이
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
        style: `
          color: ${data.text_color};
          font-size: ${getTextSize(data.text_size)};
          font-weight: ${getTextWeight(data.text_weight)};
          line-height: ${getLineHeight(data.line_height)};
          text-align: ${data.text_alignment};
          padding: ${getPadding(data.padding)};
        `
      },
    },
  });

  // 편집 모드 변경 시 에디터 상태 업데이트
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
    }
  }, [isEditing, editor]);

  // 데이터 변경 시 에디터 내용 동기화
  useEffect(() => {
    if (editor && !isEditing && data.text_content !== editor.getHTML()) {
      editor.commands.setContent(data.text_content || '');
    }
  }, [data.text_content, editor, isEditing]);

  if (!editor) {
    return <div className="animate-pulse bg-gray-200 h-6 rounded" />;
  }

  return (
    <div 
      className={`
        relative transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50 rounded-lg' : ''}
        ${!isEditing ? 'cursor-text' : ''}
        ${getContainerClasses(data)}
      `}
      onClick={() => !isEditing && onEditStart()}
    >
      {/* Bubble Menu - 텍스트 선택 시 나타나는 포맷팅 툴바 */}
      {editor && isEditing && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ 
            duration: 100,
            placement: 'top'
          }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center space-x-1"
        >
          {/* 볼드 */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1 rounded ${
              editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 4v12h4.5c2.5 0 4.5-2 4.5-4.5 0-1.5-.8-2.8-2-3.5 1.2-.7 2-2 2-3.5C15 2 13 0 10.5 0H6v4zm4.5-2c1.1 0 2 .9 2 2s-.9 2-2 2H8V2h2.5zm.5 6c1.4 0 2.5 1.1 2.5 2.5S12.4 13 11 13H8V8h3z"/>
            </svg>
          </button>

          {/* 이탤릭 */}
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1 rounded ${
              editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 1h8v2h-2.5l-3 12H13v2H5v-2h2.5l3-12H8V1z"/>
            </svg>
          </button>

          {/* 헤딩 */}
          <select
            value={getActiveHeading(editor)}
            onChange={(e) => {
              const level = parseInt(e.target.value);
              if (level === 0) {
                editor.chain().focus().setParagraph().run();
              } else {
                editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 }).run();
              }
            }}
            className="text-xs border border-gray-300 rounded px-1 py-0.5"
          >
            <option value="0">본문</option>
            <option value="1">제목 1</option>
            <option value="2">제목 2</option>
            <option value="3">제목 3</option>
            <option value="4">제목 4</option>
          </select>

          {/* 텍스트 색상 */}
          <input
            type="color"
            value={data.text_color}
            onChange={(e) => {
              onUpdate({ text_color: e.target.value });
              editor.chain().focus().setColor(e.target.value).run();
            }}
            className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
            title="텍스트 색상"
          />

          {/* 정렬 */}
          <div className="border-l border-gray-300 pl-1 ml-1 flex space-x-1">
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                key={align}
                onClick={() => {
                  editor.chain().focus().setTextAlign(align).run();
                  onUpdate({ text_alignment: align });
                }}
                className={`p-1 rounded ${
                  editor.isActive({ textAlign: align }) ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
              >
                <AlignIcon align={align} />
              </button>
            ))}
          </div>
        </BubbleMenu>
      )}

      <EditorContent editor={editor} />

      {/* 빈 상태 플레이스홀더 */}
      {!data.text_content && !isEditing && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
          {placeholder}
        </div>
      )}
    </div>
  );
};

// 헬퍼 함수들
const getTextSize = (size: TextBlockData['text_size']) => {
  const sizeMap = {
    small: '0.875rem',
    medium: '1rem',
    large: '1.25rem',
    xl: '1.5rem',
    xxl: '2rem'
  };
  return sizeMap[size] || sizeMap.medium;
};

const getTextWeight = (weight: TextBlockData['text_weight']) => {
  const weightMap = {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  };
  return weightMap[weight] || weightMap.normal;
};

const getLineHeight = (height: TextBlockData['line_height']) => {
  const heightMap = {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2'
  };
  return heightMap[height] || heightMap.normal;
};

const getPadding = (padding: TextBlockData['padding']) => {
  const paddingMap = {
    none: '0',
    small: '0.5rem',
    medium: '1rem',
    large: '2rem'
  };
  return paddingMap[padding] || paddingMap.medium;
};

const getContainerClasses = (data: TextBlockData): string => {
  const maxWidthClass = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'max-w-full'
  };
  
  return `mx-auto ${maxWidthClass[data.max_width] || maxWidthClass.large}`;
};

const getActiveHeading = (editor: any) => {
  for (let level = 1; level <= 4; level++) {
    if (editor.isActive('heading', { level })) {
      return level.toString();
    }
  }
  return '0'; // paragraph
};

// 정렬 아이콘 컴포넌트
const AlignIcon: React.FC<{ align: 'left' | 'center' | 'right' }> = ({ align }) => {
  const paths = {
    left: "M3 5h12M3 9h10M3 13h6",
    center: "M5 5h8M4 9h10M7 13h4",
    right: "M7 5h12M9 9h10M13 13h6"
  };

  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 20 20">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[align]} />
    </svg>
  );
}; 