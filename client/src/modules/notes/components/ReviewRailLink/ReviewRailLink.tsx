import { RailLink } from '../../../../shell/navigation/RailLink.tsx';
import { useReviewDueCount } from '../../api/reviewHooks.ts';

// The rail's Review link, carrying the one number the module shows: "Review · N due", counting
// the Literature notes that have never been answered (ADR 0016). It is not a nag - there is no
// overdue state and nothing accrues, so a count that has reached zero says so plainly rather
// than disappearing, and nothing here is an interval, a next-due date or a streak.
//
// The count lives in this module rather than in the rail, which is why the nav asks for this
// component instead of a number: the rule for what is due is Review's.
export function ReviewRailLink({ onClick }: { onClick?: () => void }) {
  const dueCount = useReviewDueCount();

  return (
    <RailLink
      to="/notes/review"
      nested
      onClick={onClick}
      // Until the count is read there is no badge, rather than a flickering zero.
      badge={dueCount.data === undefined ? undefined : `${dueCount.data.dueCount} due`}
    >
      Review
    </RailLink>
  );
}
