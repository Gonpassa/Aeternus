import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { EditorContent, useEditor, type AnyExtension, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Card } from '../Card/Card.tsx';
import { Prose } from '../Prose/Prose.tsx';
import { EditorMenuBar } from '../EditorMenuBar/EditorMenuBar.tsx';
import styles from './RichTextEditor.module.css';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  // Extends the shared StarterKit set below with module-specific Tiptap extensions - e.g.
  // dreams' Analysis page adds the Anchor mark (see ADR-0007). Kept out of the base
  // extension list so journal's editor isn't affected.
  extraExtensions?: AnyExtension[];
  // Fires on every selection change, not just content edits (onChange/onUpdate only fires
  // on the latter) - the Analysis page's selection-triggered anchor popover needs this.
  onSelectionUpdate?: (editor: Editor) => void;
}

export const RichTextEditor = forwardRef<Editor | null, RichTextEditorProps>(
  ({ value, onChange, placeholder, extraExtensions = [], onSelectionUpdate }, ref) => {
    const editor = useEditor({
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
      onUpdate: ({ editor: activeEditor }) => onChange(activeEditor.getHTML()),
      onSelectionUpdate: onSelectionUpdate
        ? ({ editor: activeEditor }) => onSelectionUpdate(activeEditor)
        : undefined,
    });

    useImperativeHandle(ref, () => editor, [editor]);

    useEffect(() => {
      if (editor && value !== editor.getHTML()) {
        editor.commands.setContent(value, { emitUpdate: false });
      }
    }, [value, editor]);

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
