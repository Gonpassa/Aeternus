import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { CharacterCount } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { Card } from '../../../../components/ui/Card/Card.tsx';
import { Prose } from '../../../../components/ui/Prose/Prose.tsx';

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
    <Card
      padding="sm"
      fontFamily="body"
      color="ink"
      minH="15rem"
      onClick={() => editor?.commands.focus()}
    >
      <Prose>
        <EditorContent editor={editor} data-placeholder={placeholder} />
      </Prose>
    </Card>
  );
}
