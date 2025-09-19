import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Minus,
  Type,
  Palette
} from 'lucide-react';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  postType?: 'text' | 'poetry' | 'story' | 'challenge';
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
  className = "",
  postType = "text"
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color.configure({ types: [TextStyle.name] }),
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-invert max-w-none focus:outline-none ${className}`,
        'data-placeholder': placeholder,
      },
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const toggleFormat = (format: string) => {
    switch (format) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'strike':
        editor.chain().focus().toggleStrike().run();
        break;
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'horizontalRule':
        editor.chain().focus().setHorizontalRule().run();
        break;
    }
  };

  const setAlignment = (alignment: string) => {
    editor.chain().focus().setTextAlign(alignment).run();
  };

  const setFontFamily = (fontFamily: string) => {
    editor.chain().focus().setFontFamily(fontFamily).run();
  };

  const getToolbarConfig = () => {
    if (postType === 'poetry') {
      return {
        showAlignment: true,
        showFonts: true,
        showColors: true,
        defaultFont: 'var(--font-serif)',
      };
    }
    if (postType === 'story') {
      return {
        showAlignment: true,
        showFonts: true,
        showColors: false,
        defaultFont: 'var(--font-serif)',
      };
    }
    return {
      showAlignment: true,
      showFonts: false,
      showColors: false,
      defaultFont: 'var(--font-sans)',
    };
  };

  const toolbarConfig = getToolbarConfig();

  return (
    <div className="border border-border rounded-lg">
      {/* Toolbar */}
      <div className="border-b border-border p-2 flex flex-wrap items-center gap-1">
        {/* Font Family */}
        {toolbarConfig.showFonts && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFontFamily('var(--font-sans)')}
              className={`p-2 ${editor.getAttributes('textStyle').fontFamily === 'var(--font-sans)' ? 'bg-primary/20 text-primary' : ''}`}
              data-testid="button-font-sans"
            >
              Sans
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFontFamily('var(--font-serif)')}
              className={`p-2 ${editor.getAttributes('textStyle').fontFamily === 'var(--font-serif)' ? 'bg-primary/20 text-primary' : ''}`}
              data-testid="button-font-serif"
            >
              Serif
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFontFamily('var(--font-mono)')}
              className={`p-2 ${editor.getAttributes('textStyle').fontFamily === 'var(--font-mono)' ? 'bg-primary/20 text-primary' : ''}`}
              data-testid="button-font-mono"
            >
              Mono
            </Button>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}

        {/* Basic Formatting */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleFormat('bold')}
          className={`p-2 ${editor.isActive('bold') ? 'bg-primary/20 text-primary' : ''}`}
          data-testid="button-bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleFormat('italic')}
          className={`p-2 ${editor.isActive('italic') ? 'bg-primary/20 text-primary' : ''}`}
          data-testid="button-italic"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleFormat('strike')}
          className={`p-2 ${editor.isActive('strike') ? 'bg-primary/20 text-primary' : ''}`}
          data-testid="button-strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Alignment */}
        {toolbarConfig.showAlignment && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAlignment('left')}
              className={`p-2 ${editor.isActive({ textAlign: 'left' }) ? 'bg-primary/20 text-primary' : ''}`}
              data-testid="button-align-left"
            >
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAlignment('center')}
              className={`p-2 ${editor.isActive({ textAlign: 'center' }) ? 'bg-primary/20 text-primary' : ''}`}
              data-testid="button-align-center"
            >
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAlignment('right')}
              className={`p-2 ${editor.isActive({ textAlign: 'right' }) ? 'bg-primary/20 text-primary' : ''}`}
              data-testid="button-align-right"
            >
              <AlignRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAlignment('justify')}
              className={`p-2 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-primary/20 text-primary' : ''}`}
              data-testid="button-align-justify"
            >
              <AlignJustify className="w-4 h-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}

        {/* Lists and Quotes */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleFormat('bulletList')}
          className={`p-2 ${editor.isActive('bulletList') ? 'bg-primary/20 text-primary' : ''}`}
          data-testid="button-bullet-list"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleFormat('orderedList')}
          className={`p-2 ${editor.isActive('orderedList') ? 'bg-primary/20 text-primary' : ''}`}
          data-testid="button-ordered-list"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleFormat('blockquote')}
          className={`p-2 ${editor.isActive('blockquote') ? 'bg-primary/20 text-primary' : ''}`}
          data-testid="button-blockquote"
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleFormat('horizontalRule')}
          className="p-2"
          data-testid="button-divider"
        >
          <Minus className="w-4 h-4" />
        </Button>

        {/* Colors */}
        {toolbarConfig.showColors && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setColor('#9333EA').run()}
              className="p-2"
              data-testid="button-color-purple"
            >
              <Palette className="w-4 h-4 text-purple-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setColor('#3B82F6').run()}
              className="p-2"
              data-testid="button-color-blue"
            >
              <Palette className="w-4 h-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setColor('#EF4444').run()}
              className="p-2"
              data-testid="button-color-red"
            >
              <Palette className="w-4 h-4 text-red-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().unsetColor().run()}
              className="p-2"
              data-testid="button-color-default"
            >
              <Type className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Editor */}
      <div className="p-4">
        <EditorContent 
          editor={editor} 
          className={`${postType === 'poetry' ? 'font-serif leading-8' : ''} ${className}`}
          data-testid="rich-text-editor-content"
        />
      </div>
    </div>
  );
}
