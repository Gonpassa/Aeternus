import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TopicListEntry } from '@nee3/shared-types';
import { Dialog } from '../../../../../atoms/Dialog/Dialog.tsx';
import { FormField } from '../../../../../atoms/FormField/FormField.tsx';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { TOPIC_NAME_MAX } from '../../../utils/topicLimits.ts';
import { topicCarrierLabel } from '../../../utils/topicCarriers.ts';
import {
  mergeTargetFor,
  renameTopicSchema,
  type RenameTopicFormOutput,
  type RenameTopicFormValues,
} from './RenameTopicDialog.utils.ts';

export interface RenameTopicDialogProps {
  open: boolean;
  topic: TopicListEntry;
  // The whole vocabulary, so the dialog can tell a rename from a merge before the request goes:
  // a name that already belongs to another Topic *is* the merge (CONTEXT.md, Topic).
  vocabulary: TopicListEntry[];
  onClose: () => void;
  // Resolves with the Topic the name already belongs to when the server refused an unconfirmed
  // merge, and with null when the rename went through. The vocabulary above is only the fast
  // path: if it had not loaded, this is how the dialog still learns to ask first.
  onConfirm: (name: string, merge: boolean) => Promise<TopicListEntry | null>;
}

// Renaming a Topic, which changes it on every carrier at once - and, when the new name already
// belongs to another Topic, folds the two together. The merge is confirmed before it happens and
// the confirmation names both Topics' carrier counts, because that is the part of what is about
// to change that the name alone does not show (#88).
export function RenameTopicDialog({
  open,
  topic,
  vocabulary,
  onClose,
  onConfirm,
}: RenameTopicDialogProps) {
  const [confirming, setConfirming] = useState(false);
  const [refusedMergeTarget, setRefusedMergeTarget] = useState<TopicListEntry | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<RenameTopicFormValues, unknown, RenameTopicFormOutput>({
    defaultValues: { name: topic.name },
    resolver: zodResolver(renameTopicSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const typed = useWatch({ control, name: 'name' });

  // Reopened on a Topic whose name has since changed - or after a cancelled merge - starts from
  // the name as it now stands rather than from whatever was last typed.
  useEffect(() => {
    if (open) {
      reset({ name: topic.name });
      setConfirming(false);
      setRefusedMergeTarget(null);
    }
  }, [open, topic.name, reset]);

  const mergeTarget = mergeTargetFor(typed ?? '', topic, vocabulary) ?? refusedMergeTarget;

  const save = handleSubmit(async (values) => {
    try {
      const refused = await onConfirm(values.name, confirming);
      // The server would not merge without being asked, and named the Topic the name belongs
      // to: the dialog turns into that confirmation rather than reporting a failure.
      if (refused) {
        setRefusedMergeTarget(refused);
        setConfirming(true);
        return;
      }
      onClose();
    } catch {
      // Not field-attributable: the global toast interceptor in api/client.ts has already
      // surfaced the failure, and the dialog keeps what was typed so it can be sent again.
    }
  });

  const handlePrimary = async () => {
    // A merge is asked about first; a plain rename is not, because it changes a word rather than
    // folding two Topics into one.
    if (mergeTarget && !confirming) {
      setConfirming(true);
      return;
    }
    await save();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="small"
      role={confirming ? 'alertdialog' : 'dialog'}
      header={{ title: confirming ? 'Merge these two Topics?' : 'Rename this Topic' }}
      footer={{
        secondary: {
          label: 'Cancel',
          onClick: confirming
            ? () => {
                setConfirming(false);
                setRefusedMergeTarget(null);
              }
            : onClose,
        },
        primary: {
          label: confirming ? 'Merge Topics' : 'Rename Topic',
          onClick: handlePrimary,
          loading: isSubmitting,
        },
      }}
    >
      {confirming && mergeTarget ? (
        <Stack direction="column" gap="3">
          <Text textStyle="body">
            “{topic.name}” ({topicCarrierLabel(topic)}) folds into “{mergeTarget.name}” (
            {topicCarrierLabel(mergeTarget)}). Every carrier ends up wearing “{mergeTarget.name}”,
            and “{topic.name}” leaves the vocabulary.
          </Text>
          <Text textStyle="label" color="inkSoft">
            No note is deleted.
          </Text>
        </Stack>
      ) : (
        <Stack direction="column" gap="3">
          <FormField
            control={control}
            name="name"
            label="Topic"
            maxLength={TOPIC_NAME_MAX}
            placeholder="What is it about?"
          />
          <Text textStyle="label" color="inkSoft">
            {mergeTarget
              ? `“${mergeTarget.name}” already exists, so renaming merges the two.`
              : `The new name replaces the old one everywhere: ${topicCarrierLabel(topic)}.`}
          </Text>
        </Stack>
      )}
    </Dialog>
  );
}
