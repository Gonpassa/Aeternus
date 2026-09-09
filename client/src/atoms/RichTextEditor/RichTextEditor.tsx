import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { EditorContent, useEditor, type AnyExtension, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Card } from '../Card/Card.tsx';
import { Prose } from '../Prose/Prose.tsx';
import { EditorMenuBar } from '../EditorMenuBar/EditorMenuBar.tsx';
import styles from './RichTextEditor.module.css';

export interface RichTextEditorProps {
  value: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  // Extends the shared StarterKit set below with module-specific Tiptap extensions - e.g.
  // dreams' Analysis page adds the Anchor mark (see ADR-0007). Kept out of the base
  // extension list so journal's editor isn't affected.
  extraExtensions?: AnyExtension[];
  // Renders the document without editing chrome (no menu bar, no card frame) and with
  // typing disabled. Programmatic commands via the ref still work - the dreams Analysis
  // page uses them to apply Anchor marks to a document the user cannot type into.
  readOnly?: boolean;
}

export const RichTextEditor = forwardRef<Editor | null, RichTextEditorProps>(
  ({ value, onChange, placeholder, extraExtensions = [], readOnly }, ref) => {
    const editor = useEditor({
      editable: !readOnly,
      extensions: [
        StarterKit.configure({
          // Kept in sync with each consuming module's backend sanitize.ts allow-list
          // (journal per ADR-0003, dreams mirrors it) - see each module's sanitize.test.ts
          // mark-set contract test.
          heading: { levels: [1, 2, 3] },
          strike: false,
          code: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
        }),
        ...extraExtensions,
      ],
      content: value,
      onUpdate: ({ editor: activeEditor }) => onChange?.(activeEditor.getHTML()),
    });

    useImperativeHandle(ref, () => editor, [editor]);

    useEffect(() => {
      if (editor && value !== editor.getHTML()) {
        editor.commands.setContent(value, { emitUpdate: false });
      }
    }, [value, editor]);

    if (readOnly) {
      return (
        <Prose>
          <EditorContent editor={editor} />
        </Prose>
      );
    }

    return (
      <Card
        padding="sm"
        textStyle="body"
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
  },
);
