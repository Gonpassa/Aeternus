import { useState } from 'react';
import { Tab } from '../../atoms/Tab/Tab.tsx';
import { Tabs } from '../../atoms/Tabs/Tabs.tsx';
import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { Section } from './Section.tsx';

const PANELS: Record<string, string> = {
  analytic: 'Tracing elements backward to their sources',
  synthetic: 'Reading the whole dream forward',
  associative: 'Following what each image brings to mind',
};

export function TabsDemo() {
  const [tab, setTab] = useState('analytic');

  return (
    <Section
      title="Tabs"
      description="view switcher, from atoms/Tabs - arrows and Home/End move focus, Enter or Space selects"
    >
      <Stack direction="column" align="stretch" maxW="md">
        <Tabs value={tab} onChange={setTab} aria-label="Analysis mode">
          <Tab value="analytic" label="Analytic" />
          <Tab value="synthetic" label="Synthetic" />
          <Tab value="associative" label="Associative" />
        </Tabs>
        <Text fontFamily="body" fontSize="sm" color="inkSoft" mt="3">
          {PANELS[tab]}
        </Text>
      </Stack>
    </Section>
  );
}
