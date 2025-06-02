import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';

interface TextBlockData {
  text_content: string;
  text_size?: 'small' | 'medium' | 'large';
  text_color?: string;
  text_weight?: 'normal' | 'medium' | 'bold';
  text_style?: 'paragraph' | 'heading';
  text_alignment?: 'left' | 'center' | 'right';
  max_width?: 'small' | 'medium' | 'large' | 'full';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

interface BasicTiptapTextBlockProps {
  blockId: string;
  data: TextBlockData;
  isEditing: boolean;
  onUpdate: (blockId: string, newData: Partial<TextBlockData>) => void;
  onEditEnd: () => void;
  placeholder?: string;
}

export const BasicTiptapTextBlock: React.FC<BasicTiptapTextBlockProps> = ({
  blockId,
  data,
  isEditing,
  onUpdate,
  onEditEnd,
  placeholder = "텍스트를 입력하세요..."
}) => {
  // Tiptap 에디터 초기화
  const editor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({
        levels: [1, 2, 3, 4]
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder,
        emptyEditorClass: 'is-editor-empty',
      })
    ],
    content: data.text_content || '',
    editable: isEditing,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none ${
          isEditing ? 'border-2 border-green-300 rounded p-4' : ''
        }`
      }
    },
    // 콘텐츠 변경 시 상태 업데이트
    onUpdate: ({ editor }) => {
      const htmlContent = editor.getHTML();
      // 디바운스 처리 (실제 구현 시 필요)
      onUpdate(blockId, { text_content: htmlContent });
    }
  });

  // 편집 모드 변경 시 에디터 업데이트
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
      
      if (isEditing) {
        // 편집 모드 진입 시 포커스
        setTimeout(() => {
          editor.commands.focus();
        }, 100);
      }
    }
  }, [editor, isEditing]);

  // 키보드 단축키 처리
  useEffect(() => {
    if (!isEditing || !editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 키로 편집 모드 종료
      if (e.key === 'Escape') {
        e.preventDefault();
        onEditEnd();
      }
      
      // Ctrl+Enter로 편집 모드 종료
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onEditEnd();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, editor, onEditEnd]);

  // 에디터 스타일 계산
  const getEditorStyles = () => {
    const styles: React.CSSProperties = {};
    
    if (data.text_color) {
      styles.color = data.text_color;
    }
    
    return styles;
  };

  // 에디터 클래스 계산
  const getEditorClasses = () => {
    const classes = ['transition-all duration-200'];
    
    // 텍스트 크기
    switch (data.text_size) {
      case 'small':
        classes.push('text-sm');
        break;
      case 'large':
        classes.push('text-lg');
        break;
      default:
        classes.push('text-base');
    }
    
    // 텍스트 굵기
    switch (data.text_weight) {
      case 'medium':
        classes.push('font-medium');
        break;
      case 'bold':
        classes.push('font-bold');
        break;
      default:
        classes.push('font-normal');
    }
    
    // 텍스트 정렬
    switch (data.text_alignment) {
      case 'center':
        classes.push('text-center');
        break;
      case 'right':
        classes.push('text-right');
        break;
      default:
        classes.push('text-left');
    }
    
    // 최대 너비
    switch (data.max_width) {
      case 'small':
        classes.push('max-w-md');
        break;
      case 'large':
        classes.push('max-w-4xl');
        break;
      case 'full':
        classes.push('max-w-full');
        break;
      default:
        classes.push('max-w-2xl');
    }
    
    // 패딩
    switch (data.padding) {
      case 'none':
        classes.push('p-0');
        break;
      case 'small':
        classes.push('p-2');
        break;
      case 'large':
        classes.push('p-8');
        break;
      default:
        classes.push('p-4');
    }
    
    return classes.join(' ');
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        에디터 로딩 중...
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 편집 모드 툴바 */}
      {isEditing && <TiptapToolbar editor={editor} />}
      
      {/* 에디터 콘텐츠 */}
      <div 
        className={getEditorClasses()}
        style={getEditorStyles()}
      >
        <EditorContent editor={editor} />
      </div>
      
      {/* 편집 모드 안내 */}
      {isEditing && (
        <div className="absolute -bottom-8 left-0 text-xs text-gray-500">
          ESC 또는 Ctrl+Enter로 편집 완료
        </div>
      )}
    </div>
  );
};

// 기본 Tiptap 툴바 컴포넌트
const TiptapToolbar: React.FC<{ editor: any }> = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="flex items-center space-x-2 p-2 mb-2 bg-gray-50 border rounded-lg">
      {/* 텍스트 스타일 버튼들 */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded ${
          editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-200'
        }`}
        title="굵게 (Ctrl+B)"
      >
        <span className="font-bold">B</span>
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded ${
          editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-200'
        }`}
        title="기울임 (Ctrl+I)"
      >
        <span className="italic">I</span>
      </button>

      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded ${
          editor.isActive('underline') ? 'bg-gray-200' : 'hover:bg-gray-200'
        }`}
        title="밑줄 (Ctrl+U)"
      >
        <span className="underline">U</span>
      </button>
      
      <div className="w-px h-6 bg-gray-300" />
      
      {/* 헤딩 버튼들 */}
      <button
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`px-2 py-1 text-sm rounded ${
          editor.isActive('paragraph') ? 'bg-gray-200' : 'hover:bg-gray-200'
        }`}
      >
        P
      </button>
      
      {[1, 2, 3].map((level) => (
        <button
          key={level}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          className={`px-2 py-1 text-sm rounded ${
            editor.isActive('heading', { level }) ? 'bg-gray-200' : 'hover:bg-gray-200'
          }`}
        >
          H{level}
        </button>
      ))}
      
      <div className="w-px h-6 bg-gray-300" />
      
      {/* 리스트 버튼들 */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded ${
          editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-200'
        }`}
        title="불릿 리스트"
      >
        •
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded ${
          editor.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-200'
        }`}
        title="번호 리스트"
      >
        1.
      </button>
    </div>
  );
};

// useEditorState의 actions.updateBlock 사용 예시:
/*
사용 방법:

1. InlineEditableBlock에서 텍스트 블록이 편집 모드일 때:
```tsx
{block.type === 'text' && isEditing && (
  <BasicTiptapTextBlock
    blockId={block.id}
    data={block.data}
    isEditing={true}
    onUpdate={(blockId, newData) => {
      // useEditorState의 actions.updateBlock 호출
      actions.updateBlock(blockId, { 
        data: { ...block.data, ...newData },
        updated_at: new Date().toISOString()
      });
    }}
    onEditEnd={() => actions.setEditing(null)}
  />
)}
```

2. 상태 플로우:
- 사용자가 텍스트 블록을 더블클릭
- actions.setEditing(blockId) 호출
- BasicTiptapTextBlock이 편집 모드로 렌더링
- 사용자가 텍스트 수정
- onUpdate 콜백으로 actions.updateBlock 호출
- useEditorState에서 상태 업데이트 및 자동 저장 트리거
- ESC 키로 actions.setEditing(null) 호출하여 편집 모드 종료
*/ 