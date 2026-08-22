import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { ToggleButton } from '../../../../atoms/ToggleButton/ToggleButton.tsx';
import {
  ToggleButtonGroup,
  ToggleButtonGroupItem,
} from '../../../../atoms/ToggleButtonGroup/ToggleButtonGroup.tsx';
import { ToolbarActionButton } from '../../../../atoms/ToolbarActionButton/ToolbarActionButton.tsx';
import styles from './EditorMenuBar.module.css';

export interface EditorMenuBarProps {
  editor: Editor | null;
}

type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3';
type ListType = 'bulletList' | 'orderedList';

const getBlockType = (editor: Editor | null): BlockType => {
  if (editor?.isActive('heading', { level: 1 })) return 'heading1';
  if (editor?.isActive('heading', { level: 2 })) return 'heading2';
  if (editor?.isActive('heading', { level: 3 })) return 'heading3';
  return 'paragraph';
};

const getListType = (editor: Editor | null): ListType | null => {
  if (editor?.isActive('bulletList')) return 'bulletList';
  if (editor?.isActive('orderedList')) return 'orderedList';
  return null;
};

const editorMenuBarStateSelector = ({ editor }: { editor: Editor | null }) => ({
  canBold: editor?.can().chain().toggleBold().run() ?? false,
  isBold: editor?.isActive('bold') ?? false,
  canItalic: editor?.can().chain().toggleItalic().run() ?? false,
  isItalic: editor?.isActive('italic') ?? false,
  blockType: getBlockType(editor),
  listType: getListType(editor),
});

const setBlockType = (editor: Editor, blockType: BlockType) => {
  if (blockType === 'paragraph') {
    editor.chain().focus().setParagraph().run();
    return;
  }
  const level = Number(blockType.slice(-1)) as 1 | 2 | 3;
  editor.chain().focus().setHeading({ level }).run();
};

const setListType = (editor: Editor, listType: ListType) => {
  if (listType === 'bulletList') {
    editor.chain().focus().toggleBulletList().run();
    return;
  }
  editor.chain().focus().toggleOrderedList().run();
};

export function EditorMenuBar({ editor }: EditorMenuBarProps) {
  const editorState =
    useEditorState({
      editor,
      selector: editorMenuBarStateSelector,
    }) ?? editorMenuBarStateSelector({ editor: null });

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
      <div className={styles.group}>
        <ToggleButton
          pressed={editorState.isBold}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          disabled={!editorState.canBold}
        >
          Bold
        </ToggleButton>
        <ToggleButton
          pressed={editorState.isItalic}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editorState.canItalic}
        >
          Italic
        </ToggleButton>
      </div>
      <ToggleButtonGroup
        className={styles.group}
        aria-label="Block type"
        value={editorState.blockType}
        onChange={(value) => setBlockType(editor, value as BlockType)}
      >
        <ToggleButtonGroupItem value="paragraph">Paragraph</ToggleButtonGroupItem>
        <ToggleButtonGroupItem value="heading1">H1</ToggleButtonGroupItem>
        <ToggleButtonGroupItem value="heading2">H2</ToggleButtonGroupItem>
        <ToggleButtonGroupItem value="heading3">H3</ToggleButtonGroupItem>
      </ToggleButtonGroup>
      <ToggleButtonGroup
        className={styles.group}
        aria-label="List type"
        value={editorState.listType}
        onChange={(value) => setListType(editor, value as ListType)}
      >
        <ToggleButtonGroupItem value="bulletList">Bullet list</ToggleButtonGroupItem>
        <ToggleButtonGroupItem value="orderedList">Ordered list</ToggleButtonGroupItem>
      </ToggleButtonGroup>
      <div className={styles.group}>
        <ToolbarActionButton onClick={() => editor.chain().focus().unsetAllMarks().run()}>
          Clear marks
        </ToolbarActionButton>
        <ToolbarActionButton onClick={() => editor.chain().focus().clearNodes().run()}>
          Clear nodes
        </ToolbarActionButton>
        <ToolbarActionButton onClick={() => editor.chain().focus().setHardBreak().run()}>
          Hard break
        </ToolbarActionButton>
      </div>
    </div>
  );
}
