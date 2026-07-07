# Codex Startup Checklist

Before making changes in this repository, run:

```bash
npm run check:sync
```

If the command reports that the local branch is behind, ahead, diverged, or has fetch problems, stop and tell the user before editing files.

Exception: if the local branch is only ahead because of commits made by Codex in the current session, Codex may push those commits automatically before starting the next task, then rerun `npm run check:sync`.

This keeps future Codex sessions aligned with `origin` before work starts.
