import { LoadingGate } from '../../atoms/LoadingGate/LoadingGate.tsx';
import { Section } from './Section.tsx';

export function LoadingGateDemo() {
  return (
    <Section
      title="LoadingGate"
      description="centers a Spinner within a content area, from atoms/LoadingGate - used to gate query-dependent content while page chrome renders unconditionally"
    >
      <LoadingGate minH="160px" borderWidth="1px" borderColor="line" />
    </Section>
  );
}
