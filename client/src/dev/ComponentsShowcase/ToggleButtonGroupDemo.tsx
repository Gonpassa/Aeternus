import { useState } from 'react';
import {
  ToggleButtonGroup,
  ToggleButtonGroupItem,
} from '../../atoms/ToggleButtonGroup/ToggleButtonGroup.tsx';
import { Section } from './Section.tsx';

export function ToggleButtonGroupDemo() {
  const [blockType, setBlockType] = useState('paragraph');

  return (
    <Section
      title="ToggleButtonGroup"
      description="single-selection radiogroup, mirroring EditorMenuBar's block-type group"
    >
      <ToggleButtonGroup aria-label="Block type" value={blockType} onChange={setBlockType}>
        <ToggleButtonGroupItem value="paragraph">Paragraph</ToggleButtonGroupItem>
        <ToggleButtonGroupItem value="heading1">H1</ToggleButtonGroupItem>
        <ToggleButtonGroupItem value="heading2">H2</ToggleButtonGroupItem>
        <ToggleButtonGroupItem value="heading3">H3</ToggleButtonGroupItem>
      </ToggleButtonGroup>
    </Section>
  );
}
