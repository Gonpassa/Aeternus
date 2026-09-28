# Branching, worktrees, and pull requests

Every change reaches `main` through a pull request.
Nothing is committed directly to `main`, including docs, `CONTEXT.md`, ADRs, and README edits.

## The default loop: one branch per issue

The primary checkout at `Aeternus/` rests on `main`.
When work starts on an issue, branch from an up-to-date `main` there, do the work, open a PR, and return the checkout to `main` once the PR is open.

```sh
git switch main && git pull Aeternus main
git switch -c feature/<slug>-<issue-number>
# ... work, commit ...
git push -u Aeternus feature/<slug>-<issue-number>
gh pr create --base main --title "..." --body "..."
git switch main
```

The PR is where the work stops.
The agent pushes the branch and opens the PR against `main`, then hands over the URL.
The user reviews and merges on GitHub; the agent does not merge.

### Branch naming

`<type>/<slug>-<issue-number>`, where `<type>` is one of:

| Type        | For                                                  |
| ----------- | ---------------------------------------------------- |
| `feature`   | New behaviour against an issue                       |
| `fix`       | Bug fixes                                            |
| `chore`     | Tooling, config, dependency, and docs-only changes   |
| `prototype` | Throwaway variants built to answer a design question |
| `research`  | Findings captured as Markdown, no product code       |

Drop the `-<issue-number>` suffix only when there genuinely is no issue.
Older branches in this repo predate the convention and use mixed forms; do not copy them.

### PR body

Open with `Closes #<issue-number>` so the issue closes on merge.
Then state what changed and how it was verified (which tests, which pages checked in the browser, against which database).
Prototype and research branches say so explicitly, and say what question they were built to answer.

## Parallel work: one worktree per concurrent task

Two tasks cannot share the primary checkout, because a branch switch would yank the files out from under the other one.
When a second task has to run while the first is still open, give it its own git worktree.

```sh
git worktree add .claude/worktrees/<branch> -b <branch> main
```

`.claude/worktrees/` is excluded in `.git/info/exclude`, so worktrees never show up as untracked files.
All worktrees share the one `.git` directory, so there is no re-clone and every branch is visible from every worktree.

### A fresh worktree needs setup before checks pass

A new worktree starts with no `node_modules` and no environment files.
Both are gitignored, so neither comes across from the primary checkout.

```sh
cd .claude/worktrees/<branch>
npm install
cp ../../../backend/.env.test backend/.env.test
```

Run lint and tests only after that.
Never copy `backend/.env` into a worktree: it points at the real `nee3` database, which is off-limits to the agent (see the data privacy section of `CLAUDE.md`).

### Running two dev servers at once

Each worktree's backend and client need their own ports, or the second one fails to bind.
Set `PORT` for the backend and pass `--port` to Vite when starting a dev server in a worktree, and remember to point the client's proxy at the matching backend port.

### Tearing a worktree down

Once the PR is merged, remove the worktree and let the branch go.

```sh
git worktree remove .claude/worktrees/<branch>
git branch -d <branch>
```

`git worktree list` shows what is still live.
A worktree marked `locked` was locked deliberately; unlock it with `git worktree unlock <path>` before removing.

## After a merge

PRs here are squash-merged, so the branch tip never becomes an ancestor of `main`.
`git branch --merged main` will not list it, and `git branch -d` will refuse to delete it.
Go by the PR state instead:

```sh
git switch main && git pull Aeternus main
git fetch --prune Aeternus
gh pr list --state merged --limit 50 --json headRefName --jq '.[].headRefName' \
  | while read -r b; do git branch -D "$b" 2>/dev/null; done
```

`git branch -D` is a force delete, which is correct here only because the PR is merged.
Check `gh pr list --state merged` before running it, and never force-delete a branch with no merged PR.
