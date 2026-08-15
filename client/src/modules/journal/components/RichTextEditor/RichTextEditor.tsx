import { useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { EditorContent, useEditor } from '@tiptap/react';
import { CharacterCount } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      CharacterCount.configure({
        limit: 10,
      }),
    ],
    content: value,
    onUpdate: ({ editor: activeEditor }) => onChange(activeEditor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <Box borderWidth="1px" borderColor="line" bg="paperCard" p="3" fontFamily="body" color="ink">
      <EditorContent
        editor={editor}
        className="entry-content"
        style={{ minHeight: '15rem' }}
        data-placeholder={placeholder}
      />
    </Box>
  );
}
