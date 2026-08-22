import { PropsWithChildren, useState } from 'react';
import { ChevronLeft, Star } from 'lucide-react';
import { Button, type ButtonSize, type ButtonVariant } from '../../components/ui/Button/Button.tsx';
import { Stack } from '../../components/ui/Stack/Stack.tsx';
import { Heading } from '../../components/ui/Heading/Heading.tsx';
import { Text } from '../../components/ui/Text/Text.tsx';
import { Card } from '../../components/ui/Card/Card.tsx';
import { Calendar } from '../../components/ui/Calendar/Calendar.tsx';
import { Dialog } from '../../components/ui/Dialog/Dialog.tsx';
import { useDialogState } from '../../components/ui/Dialog/useDialogState.ts';
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
import { ToggleButton } from '../../components/ui/ToggleButton/ToggleButton.tsx';
import {
  ToggleButtonGroup,
  ToggleButtonGroupItem,
} from '../../components/ui/ToggleButtonGroup/ToggleButtonGroup.tsx';
import { ToolbarActionButton } from '../../components/ui/ToolbarActionButton/ToolbarActionButton.tsx';
import { IconButton } from '../../components/ui/IconButton/IconButton.tsx';

const BUTTON_VARIANTS: ButtonVariant[] = ['default', 'destructive', 'outline', 'ghost', 'link'];
const BUTTON_SIZES: ButtonSize[] = ['default', 'xs', 'sm', 'lg'];

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
    <Stack as="section" direction="column" mb="12">
      <Heading as="h2" fontFamily="heading" fontSize="xl" fontWeight="semibold" color="ink" mb="1">
        {title}
      </Heading>
      {description && (
        <Text fontFamily="body" fontSize="sm" color="inkSoft" mb="4">
          {description}
        </Text>
      )}
      {children}
    </Stack>
  );
}

export function ComponentsShowcase() {
  const [confirmCount, setConfirmCount] = useState(0);
  const confirmDialog = useDialogState();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectValue, setSelectValue] = useState<string[]>(['content']);
  const [togglePressed, setTogglePressed] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');

  return (
    <Stack direction="column" maxW="4xl">
      <Heading as="h1" fontFamily="heading" fontSize="3xl" fontWeight="semibold" color="ink" mb="2">
        UI components
      </Heading>
      <Text fontFamily="body" color="inkSoft" mb="10">
        Dev-only reference of every primitive in <code>components/ui/</code>, rendered with
        representative props so their functionality can be exercised without navigating the real
        app.
      </Text>

      <Section title="Button" description="every variant × size, from components/ui/Button">
        <Stack direction="column" gap="4">
          {BUTTON_VARIANTS.map((variant) => (
            <Stack key={variant} align="center" gap="3" wrap="wrap">
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
                  Button
                </Button>
              ))}
            </Stack>
          ))}
        </Stack>
      </Section>

      <Section title="Button (disabled)" description="every variant, disabled">
        <Stack align="center" gap="3" wrap="wrap">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} disabled>
              {variant}
            </Button>
          ))}
        </Stack>
      </Section>

      <Section title="Button (loading)" description="every variant, loading">
        <Stack align="center" gap="3" wrap="wrap">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} loading loadingText="Saving">
              {variant}
            </Button>
          ))}
        </Stack>
      </Section>

      <Section title="IconButton" description="every variant × size, from components/ui/IconButton">
        <Stack direction="column" gap="4">
          {BUTTON_VARIANTS.map((variant) => (
            <Stack key={variant} align="center" gap="3" wrap="wrap">
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
                <IconButton
                  key={size}
                  variant={variant}
                  size={size}
                  icon={Star}
                  aria-label={`${variant} ${size} star`}
                />
              ))}
              <IconButton
                variant={variant}
                icon={ChevronLeft}
                aria-label={`${variant} chevron left`}
              />
            </Stack>
          ))}
        </Stack>
      </Section>

      <Section
        title="ToggleButton"
        description="a two-state pressed/unpressed button, from components/ui/ToggleButton"
      >
        <ToggleButton pressed={togglePressed} onPressedChange={setTogglePressed}>
          {togglePressed ? 'Pressed' : 'Unpressed'}
        </ToggleButton>
      </Section>

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

      <Section
        title="ToolbarActionButton"
        description="stateless action buttons, from components/ui/ToolbarActionButton"
      >
        <Stack gap="2">
          <ToolbarActionButton onClick={() => {}}>Clear marks</ToolbarActionButton>
          <ToolbarActionButton onClick={() => {}}>Clear nodes</ToolbarActionButton>
        </Stack>
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
        <Card p="2" w="fit-content">
          <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} />
        </Card>
      </Section>

      <Section title="Dialog" description="controlled dialog primitive; confirmations tally below">
        <Stack align="center" gap="3">
          <Button variant="outline" onClick={confirmDialog.openDialog}>
            Delete something
          </Button>
          <Dialog
            open={confirmDialog.open}
            onClose={confirmDialog.closeDialog}
            variant="small"
            role="alertdialog"
            header={{ title: 'Delete this thing?' }}
            footer={{
              secondary: { label: 'Cancel', onClick: confirmDialog.closeDialog },
              primary: {
                label: 'Delete',
                variant: 'destructive',
                onClick: () => {
                  setConfirmCount((count) => count + 1);
                  confirmDialog.closeDialog();
                },
              },
            }}
          >
            <Text fontFamily="body" color="inkSoft">
              This action cannot be undone.
            </Text>
          </Dialog>
          <Text fontFamily="mono" fontSize="xs" color="inkSoft">
            Confirmed {confirmCount} time{confirmCount === 1 ? '' : 's'}
          </Text>
        </Stack>
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
    </Stack>
  );
}
