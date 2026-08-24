import { useState } from 'react';
import { ToggleButton } from '../../atoms/ToggleButton/ToggleButton.tsx';
import { Section } from './Section.tsx';

export function ToggleButtonDemo() {
  const [pressed, setPressed] = useState(false);

  return (
    <Section
      title="ToggleButton"
      description="a two-state pressed/unpressed button, from atoms/ToggleButton"
    >
      <ToggleButton pressed={pressed} onPressedChange={setPressed}>
        {pressed ? 'Pressed' : 'Unpressed'}
      </ToggleButton>
    </Section>
  );
}
