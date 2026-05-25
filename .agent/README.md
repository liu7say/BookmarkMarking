# AI Agent Workspace Manifest (.agent)

This directory serves as the runtime brain, behavior rules, and expert skill repository for AI agents operating in the **Bookmark Manager** workspace. 

## Directory Topology

```
.agent/
├── README.md               # This file. Directory topology and agent contracts.
├── rules/
│   ├── rules.md            # Fluent 2 UI Design Guidelines (Trigger: always_on)
│   └── clean_code.md       # Linus' "Good Taste" Code & Architecture Standards (Trigger: always_on)
├── skills/
│   └── ui-ux-pro-max/      # Deep UI/UX design intelligence tool stack & guidelines
└── knowledge/
    └── data_schema.md      # IndexedDB and Bookmark tree JSON Schema specs (source of truth)
```

## Operating Contracts

1. **Rule of Cleanliness**: Never introduce unnecessary configuration files, wrappers, or temporary build scripts here unless strictly modularized. Keep documentation direct and free of generic placeholders.
2. **Never Break Userspace**: Any rules, schemas, or instructions in this directory must aim to build robust, backward-compatible, clean code that prioritizes user safety and zero data loss.
3. **Execution Integrity**: Before creating UI elements, check `rules/rules.md` (Fluent 2) and run search scripts in `skills/ui-ux-pro-max/`. Before parsing/saving bookmarks, refer to `knowledge/data_schema.md`.
