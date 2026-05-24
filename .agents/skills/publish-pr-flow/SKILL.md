---
name: publish-pr-flow
description: "Use when the user asks to commit, stage, push, create a GitHub PR, update an existing PR, merge a PR, pass a PR, or publish local repository changes."
---

# Publish PR Flow

This skill is the repository publishing workflow. It covers commit -> push -> PR, and PR merge only when the user explicitly asks for merge/pass-through.

## Core Rules

- Inspect before acting: run `git status -sb`, review `git diff --stat`, and inspect relevant diffs before staging.
- Never stage unrelated changes silently. If the worktree is mixed, stage explicit paths by topic.
- Use Chinese commit messages by default. Commit only after understanding what the diff actually changes.
- Keep public hygiene: do not commit `.env`, tokens, private accounts, caches, raw corpora, zip archives, or local temp files.
- Verify GitHub identity before push with `gh auth status`. The active account for this repo should be `yuban12315` unless the user says otherwise.
- Use `gh` for PR operations. Prefer draft PRs unless the user asks for ready review.
- Do not merge a PR unless the user explicitly says to merge, pass, land, or approve the PR, and the PR target is verified.

## Decision Flow

1. **Orient**
   - `git status -sb`
   - `git branch --show-current`
   - `git remote -v`
   - `gh auth status`
   - If needed: `gh repo view --json nameWithOwner,defaultBranchRef`

2. **Inspect scope**
   - `git diff --stat`
   - Read diffs for files that will be staged.
   - Check public safety with targeted search, for example:
     - `rg -n "SECRET|TOKEN|API_KEY\\s*=\\s*[^#\\s<]" . --glob '!node_modules/**' --glob '!.git/**'`
   - Add provider-specific key-prefix patterns when needed, but avoid committing real-looking example keys into docs.
   - Treat test placeholders such as `GEMINI_API_KEY=from-dotenv` as safe only when they are clearly dummy values.

3. **Validate**
   - Run the narrow checks that match the change.
   - For this repo, common checks are:
     - `python scripts/check-structure.py`
     - `python scripts/check-names.py --work song-of-blaze`
     - `npm.cmd test -- <target-test-file>` for targeted JS tests
   - If full tests fail for known environment reasons, report the exact blocker and still run relevant targeted checks.

4. **Stage and commit**
   - Stage explicit files or coherent groups.
   - Run `git diff --cached --stat` and `git diff --cached --check`.
   - Commit with a short Chinese message, such as `docs: 固化发布 PR 工作流`.
   - Split commits by intent when the diff naturally separates, for example demo code, agent workflow, and story content.

5. **Push**
   - Push the current branch with tracking: `git push -u origin <branch>`.
   - If push fails with 403 while `gh auth status` looks correct, run `gh auth setup-git --hostname github.com`, then retry once.

6. **Create or update PR**
   - Check for an existing PR first: `gh pr list --head <branch> --json number,title,url,state,isDraft`.
   - If no PR exists, create one:
     - `gh pr create --draft --base <base> --head <branch> --title "<title>" --body-file <body-file>`
   - PR body should include: summary, why, validation, known failures, and public-safety notes if relevant.
   - If a PR exists, push new commits and comment/update the PR only when useful.

7. **Pass or merge PR**
   - Only when explicitly requested.
   - Inspect status before merging:
     - `gh pr view <number> --json number,title,state,isDraft,baseRefName,headRefName,mergeStateStatus,reviewDecision,statusCheckRollup`
   - If draft, unresolved reviews, failing checks, wrong base, or unexpected head branch are present, stop and report.
   - Use the repo's preferred merge method if known; otherwise ask before choosing merge, squash, or rebase.

## Output Shape

Report only verified facts:

- branch and remote
- commits created or existing PR updated
- PR URL and draft/ready state
- checks run and their results
- any known blocker or skipped step

## Pressure Tests

- Mixed worktree: must not `git add -A`; stage coherent file groups.
- Secret-looking value: must inspect whether it is a placeholder before commit.
- Existing PR: must not create a duplicate.
- User says "通过 PR": must verify PR status and ask/stop if merge method or checks are unclear.
- Push 403: must verify `gh auth status` and align git credentials with `gh auth setup-git --hostname github.com` before retrying.
