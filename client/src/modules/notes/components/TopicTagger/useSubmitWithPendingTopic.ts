import { useRef, type BaseSyntheticEvent, type FormEvent } from 'react';
import type { TopicTaggerHandle } from './TopicTagger.tsx';

// What a form carrying a TopicTagger submits through. A Topic typed but never added is put on
// the carrier first, so it is sent with the rest instead of being dropped (#104). The ref goes
// on the tagger and `submit` on the form, wrapping react-hook-form's `handleSubmit(...)`.
export const useSubmitWithPendingTopic = (
  onSubmit: (event?: BaseSyntheticEvent) => Promise<void>,
) => {
  const topicTagger = useRef<TopicTaggerHandle>(null);

  const submit = (event: FormEvent<HTMLElement>) => {
    topicTagger.current?.commitPending();
    return onSubmit(event);
  };

  return { topicTagger, submit };
};
