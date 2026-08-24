import { Button } from '../../atoms/Button/Button.tsx';
import { VisuallyHidden } from '../../atoms/VisuallyHidden/VisuallyHidden.tsx';
import { Section } from './Section.tsx';

export function VisuallyHiddenDemo() {
  return (
    <Section
      title="VisuallyHidden"
      description="renders content off-screen but present in the accessibility tree - inspect via devtools or a screen reader; the star below has a hidden label next to it"
    >
      <Button variant="outline">
        <VisuallyHidden>Screen-reader-only label</VisuallyHidden>
        <span aria-hidden="true">&#9733;</span>
      </Button>
    </Section>
  );
}
