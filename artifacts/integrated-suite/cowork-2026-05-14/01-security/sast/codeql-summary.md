# CodeQL Summary

CodeQL يُشغَّل في .github/workflows/codeql.yml كجزء من CI.

للحصول على آخر نتائج فعلية:

`	ext
gh run list --workflow=codeql.yml --limit=1 --json conclusion,headBranch,createdAt
gh run view <run-id> --log
`

هذه الحزمة لا تشغّل CodeQL محلياً (يحتاج CodeQL CLI). تكتفي بإثبات أن المهمة موجودة في CI.

- workflow path: .github/workflows/codeql.yml
- expected conclusion: success
