import { PropsWithChildren, useState } from 'react';
import { Box, Flex, Heading, Text } from '@chakra-ui/react';
import { Button, type ButtonSize, type ButtonVariant } from '../../components/ui/Button/Button.tsx';
import { Calendar } from '../../components/ui/Calendar/Calendar.tsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog/ConfirmDialog.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/Popover/Popover.tsx';
import {
  createListCollection,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select/Select.tsx';
import { Tooltip } from '../../components/ui/Tooltip/Tooltip.tsx';
import { VisuallyHidden } from '../../components/ui/VisuallyHidden/VisuallyHidden.tsx';

const BUTTON_VARIANTS: ButtonVariant[] = [
  'default',
  'destructive',
  'outline',
  'secondary',
  'ghost',
  'link',
];
const BUTTON_SIZES: ButtonSize[] = [
  'default',
  'xs',
  'sm',
  'lg',
  'icon',
  'icon-xs',
  'icon-sm',
  'icon-lg',
];

const moodCollection = createListCollection({
  items: [
    { value: 'anxious', label: 'Anxious' },
    { value: 'content', label: 'Content' },
    { value: 'restless', label: 'Restless' },
  ],
});

function Section({
  title,
  description,
  children,
}: PropsWithChildren<{
  title: string;
  description?: string;
}>) {
  return (
    <Box as="section" mb="12">
      <Heading as="h2" fontFamily="heading" fontSize="xl" fontWeight="semibold" color="ink" mb="1">
        {title}
      </Heading>
      {description && (
        <Text fontFamily="body" fontSize="sm" color="inkSoft" mb="4">
          {description}
        </Text>
      )}
      {children}
    </Box>
  );
}

export function ComponentsShowcase() {
  const [confirmCount, setConfirmCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectValue, setSelectValue] = useState<string[]>(['content']);

  return (
    <Box maxW="4xl">
      <Heading as="h1" fontFamily="heading" fontSize="3xl" fontWeight="semibold" color="ink" mb="2">
        UI components
      </Heading>
      <Text fontFamily="body" color="inkSoft" mb="10">
        Dev-only reference of every primitive in <code>components/ui/</code>, rendered with
        representative props so their functionality can be exercised without navigating the real
        app.
      </Text>

      <Section title="Button" description="every variant × size, from components/ui/Button">
        <Flex direction="column" gap="4">
          {BUTTON_VARIANTS.map((variant) => (
            <Flex key={variant} align="center" gap="3" wrap="wrap">
              <Text
                fontFamily="mono"
                fontSize="xs"
                textTransform="uppercase"
                color="inkSoft"
                w="24"
                flexShrink="0"
              >
                {variant}
              </Text>
              {BUTTON_SIZES.map((size) => (
                <Button key={size} variant={variant} size={size}>
                  {size.startsWith('icon') ? '★' : 'Button'}
                </Button>
              ))}
            </Flex>
          ))}
        </Flex>
      </Section>

      <Section title="Tooltip" description="hover or focus the trigger to reveal content">
        <Tooltip content="This is tooltip content">
          <Button variant="outline">Hover me</Button>
        </Tooltip>
      </Section>

      <Section title="Popover" description="click the trigger to open a floating panel">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <Text fontFamily="body" color="ink">
              Popover content goes here.
            </Text>
          </PopoverContent>
        </Popover>
      </Section>

      <Section title="Select" description="single-value select built on Ark UI">
        <Select
          collection={moodCollection}
          value={selectValue}
          onValueChange={(details) => setSelectValue(details.value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a mood" />
          </SelectTrigger>
          <SelectContent>
            {moodCollection.items.map((item) => (
              <SelectItem key={item.value} item={item}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      <Section title="Calendar" description="react-day-picker, single-select mode">
        <Box borderWidth="1px" borderColor="line" bg="paperCard" p="2" w="fit-content">
          <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} />
        </Box>
      </Section>

      <Section title="ConfirmDialog" description="alert-dialog wrapper; confirmations tally below">
        <Flex align="center" gap="3">
          <ConfirmDialog
            trigger={<Button variant="outline">Delete something</Button>}
            title="Delete this thing?"
            description="This action cannot be undone."
            confirmLabel="Delete"
            destructive
            onConfirm={() => setConfirmCount((count) => count + 1)}
          />
          <Text fontFamily="mono" fontSize="xs" color="inkSoft">
            Confirmed {confirmCount} time{confirmCount === 1 ? '' : 's'}
          </Text>
        </Flex>
      </Section>

      <Section
        title="VisuallyHidden"
        description="renders content off-screen but present in the accessibility tree - inspect via devtools or a screen reader; the star below has a hidden label next to it"
      >
        <Button variant="outline">
          <VisuallyHidden>Screen-reader-only label</VisuallyHidden>
          <span aria-hidden="true">&#9733;</span>
        </Button>
      </Section>
    </Box>
  );
}
