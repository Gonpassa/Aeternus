import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Card } from '../../../../atoms/Card/Card.tsx';
import { Prose } from '../../../../atoms/Prose/Prose.tsx';
import { EditorMenuBar } from '../EditorMenuBar/EditorMenuBar.tsx';
import styles from './RichTextEditor.module.css';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Kept in sync with backend/src/modules/journal/sanitize.ts's allow-list per
        // ADR-0003 - see sanitize.test.ts's mark-set contract test.
        heading: { levels: [1, 2, 3] },
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
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
      <EditorMenuBar editor={editor} />
      <Prose>
        <EditorContent
          editor={editor}
          data-placeholder={placeholder}
          className={styles.overrideFocus}
        />
      </Prose>
    </Card>
  );
}
