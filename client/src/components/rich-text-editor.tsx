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
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
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
  Code,
  Link2,
  Image as ImageIcon,
  Palette,
  Type,
  Highlighter
} from 'lucide-react';
import { useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  postType?: string;
}

const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Courier New', label: 'Courier' },
  { value: 'Crimson Text', label: 'Crimson' },
  { value: 'Playfair Display', label: 'Playfair' },
  { value: 'Merriweather', label: 'Merriweather' },
];

const COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E',
];

export default function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Start writing...",
  className = "",
  postType = "text"
}: RichTextEditorProps) {
  const [activeColor, setActiveColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      TextStyle,
      FontFamily,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[120px] ${
          postType === 'poetry' ? 'whitespace-pre-wrap font-serif leading-relaxed' : ''
        } ${className}`,
      },
    },
  });

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="border-b border-border p-2 flex flex-wrap items-center gap-1 bg-muted/30">
        {/* Text Formatting */}
        <div className="flex items-center gap-1">
          <Button
            variant={editor.isActive('bold') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className="h-8 w-8 p-0"
          >
            <Bold className="w-4 h-4" />
          </Button>
          
          <Button
            variant={editor.isActive('italic') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className="h-8 w-8 p-0"
          >
            <Italic className="w-4 h-4" />
          </Button>
          
          <Button
            variant={editor.isActive('strike') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className="h-8 w-8 p-0"
          >
            <Strikethrough className="w-4 h-4" />
          </Button>
          
          <Button
            variant={editor.isActive('code') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className="h-8 w-8 p-0"
          >
            <Code className="w-4 h-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Text Alignment */}
        <div className="flex items-center gap-1">
          <Button
            variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className="h-8 w-8 p-0"
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          
          <Button
            variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className="h-8 w-8 p-0"
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          
          <Button
            variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className="h-8 w-8 p-0"
          >
            <AlignRight className="w-4 h-4" />
          </Button>
          
          <Button
            variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className="h-8 w-8 p-0"
          >
            <AlignJustify className="w-4 h-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Lists and Quotes */}
        <div className="flex items-center gap-1">
          <Button
            variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className="h-8 w-8 p-0"
          >
            <List className="w-4 h-4" />
          </Button>
          
          <Button
            variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
          
          <Button
            variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className="h-8 w-8 p-0"
          >
            <Quote className="w-4 h-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Color and Highlighting */}
        <div className="flex items-center gap-1 relative">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="h-8 w-8 p-0"
            >
              <Palette className="w-4 h-4" />
            </Button>
            
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-background border border-border rounded-lg shadow-lg z-50 grid grid-cols-4 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setActiveColor(color);
                      setShowColorPicker(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          
          <Button
            variant={editor.isActive('highlight') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className="h-8 w-8 p-0"
          >
            <Highlighter className="w-4 h-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Font Family */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFontPicker(!showFontPicker)}
            className="h-8 px-2 text-sm"
          >
            <Type className="w-4 h-4 mr-1" />
            Font
          </Button>
          
          {showFontPicker && (
            <div className="absolute top-full left-0 mt-1 p-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[150px]">
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.value}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-muted rounded"
                  style={{ fontFamily: font.value }}
                  onClick={() => {
                    editor.chain().focus().setFontFamily(font.value).run();
                    setShowFontPicker(false);
                  }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Links and Media */}
        <div className="flex items-center gap-1">
          <Button
            variant={editor.isActive('link') ? 'default' : 'ghost'}
            size="sm"
            onClick={addLink}
            className="h-8 w-8 p-0"
          >
            <Link2 className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={addImage}
            className="h-8 w-8 p-0"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="p-4">
        <EditorContent 
          editor={editor} 
          placeholder={placeholder}
          className={`${postType === 'poetry' ? 'poetry-editor' : ''}`}
        />
      </div>

      {/* Character Count */}
      <div className="px-4 pb-2 text-xs text-muted-foreground text-right">
        {editor.storage.characterCount?.characters() || 0} characters
      </div>
    </div>
  );
}
