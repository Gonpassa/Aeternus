import { useState } from 'react';
import type { NoteConnection } from '@nee3/shared-types';
import { Button } from '../../../../../atoms/Button/Button.tsx';
import { Stack } from '../../../../../atoms/Stack/Stack.tsx';
import { Text } from '../../../../../atoms/Text/Text.tsx';
import { useNoteConnections } from '../../../api/noteHooks.ts';
import { useLinkActionsContext } from '../../../LinkActionsContext.tsx';
import { attributeReasons } from '../../../utils/linkReason.ts';
import { noteKindLabel, noteLabel } from '../../../utils/noteLabel.ts';
import { ReasonField } from '../../ReasonField/ReasonField.tsx';
import { NoteConnections } from '../NoteConnections.tsx';
import { RemoveLinkDialog } from './RemoveLinkDialog/RemoveLinkDialog.tsx';

export interface ConnectionRowProps {
  connection: NoteConnection;
  // The note this row is being read from, so the row can attribute each reason to the end that
  // wrote it: `reason` belongs to the Link's origin, `targetReason` to its target (ADR 0013).
  fromNoteId: number;
  // A row reached from another row stops offering to go further. One level of reaching through
  // is reading the note at the other end; two is a browsing surface, which is #88.
  nested?: boolean;
}

// One connection: the note at the other end, and underneath it the line saying why the two
// belong together. The reason is the row's substance rather than its caption - it is the
// smallest unit of the user's thinking in this module (ADR 0015) - so it sits directly under
// the name it explains, in the user's own words.
//
// The row is also where a Link is unmade and where a reason is rewritten, by the end that
// wrote it: a Link is a relation between two notes and is editable from either side
// (ADR 0013). A row reached from another row is read rather than edited, and a row rendered
// outside a LinkActionsProvider is read too.
export function ConnectionRow({ connection, fromNoteId, nested = false }: ConnectionRowProps) {
  const [opened, setOpened] = useState(false);
  const [editingReason, setEditingReason] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const { heading, detail } = noteLabel(connection);
  const { link, other } = connection;
  const connections = useNoteConnections(other.id, opened);
  const actions = useLinkActionsContext();

  // Which end wrote which line, said from where this row is being read. The origin's reason is
  // always present; the other end's is there only once that end has linked back.
  const { ownReason, otherReason } = attributeReasons(link, fromNoteId);
  // With one reason on the row there is nothing to confuse it with, so it stands unlabelled.
  // Two reasons need saying which end wrote which, since colour alone does not say it.
  const bothEnds = ownReason !== null && otherReason !== null;
  // Changing a Link is offered where the Link is read from one of its own ends, and only there.
  const editable = !nested && actions !== null;

  return (
    <Stack
      as="li"
      direction="column"
      gap="1"
      borderLeftWidth="2px"
      borderLeftColor="borderSoft"
      pl="3"
      py="1"
    >
      <Text variant="eyebrow" color="inkSoft">
        {noteKindLabel(other)}
      </Text>
      <Text textStyle="bodyStrong" color="ink">
        {heading}
      </Text>
      {detail !== null && (
        <Text textStyle="body" color="inkSoft">
          {detail}
        </Text>
      )}
      {otherReason !== null && (
        <>
          {bothEnds && (
            <Text variant="eyebrow" color="inkSoft">
              Its reason
            </Text>
          )}
          <Text textStyle="body" color="ink">
            {otherReason}
          </Text>
        </>
      )}
      {ownReason !== null && (
        <>
          {bothEnds && (
            <Text variant="eyebrow" color="inkSoft">
              This note&apos;s reason
            </Text>
          )}
          {/* The line this end wrote, rewritten where it is read. Only this end's is editable:
              the other end's reason is not this note's to restate (ADR 0013). */}
          {editable && editingReason ? (
            <ReasonField
              reason={ownReason}
              id={`connection-reason-error-${link.id}`}
              submitLabel="Save the reason"
              onSubmit={async (reason) => {
                await actions.editReason(link.id, fromNoteId, reason);
                setEditingReason(false);
              }}
              onCancel={() => setEditingReason(false)}
            />
          ) : (
            <Text textStyle="body" color="inkSoft">
              {ownReason}
            </Text>
          )}
        </>
      )}

      {editable && !editingReason && (
        <Stack align="center" gap="3" wrap="wrap">
          {ownReason !== null && (
            <Button type="button" size="xs" variant="ghost" onClick={() => setEditingReason(true)}>
              Rewrite the reason
            </Button>
          )}
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => setConfirmingRemoval(true)}
          >
            Remove this connection
          </Button>
        </Stack>
      )}

      {!nested && (
        <Stack direction="column" gap="2" align="flex-start">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            aria-expanded={opened}
            onClick={() => setOpened(!opened)}
          >
            {opened ? 'Hide its connections' : 'Its connections'}
          </Button>
          {opened && connections.data && (
            <NoteConnections connections={connections.data.connections} noteId={other.id} nested />
          )}
          {opened && connections.isError && (
            <Text variant="muted">Its connections could not be loaded.</Text>
          )}
        </Stack>
      )}

      {editable && (
        <RemoveLinkDialog
          open={confirmingRemoval}
          otherLabel={heading}
          onClose={() => setConfirmingRemoval(false)}
          onConfirm={() => actions.removeLink(link.id)}
        />
      )}
    </Stack>
  );
}
