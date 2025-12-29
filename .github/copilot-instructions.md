# Copilot Instructions

## Pre-commit Workflow

After making any code changes, always run `pre-commit run --all-files` to ensure code quality and catch lint or syntax issues before considering the task complete.
If pre-commit reports errors, fix them and rerun until all checks pass or only non-blocking warnings remain.
Document this workflow in all future code contributions and automation.
