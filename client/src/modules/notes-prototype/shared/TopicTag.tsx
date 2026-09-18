// PROTOTYPE - the demo.html tag chip, as a button so any Topic anywhere opens the Topic view (#71).
import { Button } from '../../../atoms/Button/Button.tsx';

export function TopicTag({ topic, onOpen }: { topic: string; onOpen?: (topic: string) => void }) {
  return (
    <Button
      variant="ghost"
      size="xs"
      h="auto"
      px="1.5"
      py="0.5"
      textStyle="label"
      color="inkBlue"
      borderWidth="1px"
      borderColor="line"
      borderRadius="sm"
      _hover={{ bg: 'paperCard', textDecoration: 'none' }}
      onClick={() => onOpen?.(topic)}
    >
      {topic}
    </Button>
  );
}
