import { Stack } from '../../atoms/Stack/Stack.tsx';
import { Heading } from '../../atoms/Heading/Heading.tsx';
import { Text } from '../../atoms/Text/Text.tsx';
import { ButtonDemo } from './ButtonDemo.tsx';
import { ButtonDisabledDemo } from './ButtonDisabledDemo.tsx';
import { ButtonLoadingDemo } from './ButtonLoadingDemo.tsx';
import { IconButtonDemo } from './IconButtonDemo.tsx';
import { ToggleButtonDemo } from './ToggleButtonDemo.tsx';
import { ToggleButtonGroupDemo } from './ToggleButtonGroupDemo.tsx';
import { ToolbarActionButtonDemo } from './ToolbarActionButtonDemo.tsx';
import { FormFieldDemo } from './FormFieldDemo.tsx';
import { TooltipDemo } from './TooltipDemo.tsx';
import { PopoverDemo } from './PopoverDemo.tsx';
import { SelectDemo } from './SelectDemo.tsx';
import { IndexCardDemo } from './IndexCardDemo.tsx';
import { DieCutTabDemo } from './DieCutTabDemo.tsx';
import { CalendarDemo } from './CalendarDemo.tsx';
import { DialogDemo } from './DialogDemo.tsx';
import { VisuallyHiddenDemo } from './VisuallyHiddenDemo.tsx';
import { SpinnerDemo } from './SpinnerDemo.tsx';
import { LoadingGateDemo } from './LoadingGateDemo.tsx';

export function ComponentsShowcase() {
  return (
    <Stack direction="column" maxW="4xl">
      <Heading as="h1" variant="page" mb="2">
        UI components
      </Heading>
      <Text fontFamily="body" color="inkSoft" mb="10">
        Dev-only reference of every primitive in <code>atoms/</code>, rendered with representative
        props so their functionality can be exercised without navigating the real app.
      </Text>

      <ButtonDemo />
      <ButtonDisabledDemo />
      <ButtonLoadingDemo />
      <IconButtonDemo />
      <ToggleButtonDemo />
      <ToggleButtonGroupDemo />
      <ToolbarActionButtonDemo />
      <FormFieldDemo />
      <TooltipDemo />
      <PopoverDemo />
      <SelectDemo />
      <IndexCardDemo />
      <DieCutTabDemo />
      <CalendarDemo />
      <DialogDemo />
      <VisuallyHiddenDemo />
      <SpinnerDemo />
      <LoadingGateDemo />
    </Stack>
  );
}
