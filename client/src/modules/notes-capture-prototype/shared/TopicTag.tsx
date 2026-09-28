// PROTOTYPE - the demo.html tag chip. Topics are inherited from the Source on a Literature
// note (#68), so here it is a label, not a control.
import { Text } from '../../../atoms/Text/Text.tsx';

export function TopicTag({ topic }: { topic: string }) {
  return (
    <Text
      as="span"
      textStyle="label"
      color="inkBlue"
      borderWidth="1px"
      borderColor="line"
      borderRadius="sm"
      px="1.5"
      py="0.5"
    >
      {topic}
    </Text>
  );
}
