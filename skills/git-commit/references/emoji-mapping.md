# Emoji Mapping Reference

Extended emoji reference for specialized commit types. Use when the 10 common types in SKILL.md are too broad for the specific change.

## Lookup Table

### Features (feat)

| Emoji | Description | Use instead of ✨ when... |
|-------|-------------|--------------------------|
| 💥 | Introduce breaking changes | ALWAYS use for breaking changes |
| 🏷️ | Add or update types | Change is ONLY type/interface definitions |
| 💬 | Add or update text and literals | Change is ONLY string/copy updates |
| 🌐 | Internationalization and localization | Adding i18n/l10n support |
| 👔 | Add or update business logic | Emphasizing domain logic vs UI/infra |
| 📱 | Work on responsive design | Change is responsive/mobile-specific |
| 🚸 | Improve user experience / usability | UX improvement without new functionality |
| ♿️ | Improve accessibility | Accessibility-specific improvement |
| 🧵 | Multithreading or concurrency | Concurrency-specific code |
| 🔍️ | Improve SEO | SEO-specific optimization |
| 📈 | Analytics or tracking code | Adding/updating analytics |
| 🔊 | Add or update logs | Adding logging instrumentation |
| 🚩 | Feature flags | Adding/updating/removing feature flags |
| 🦺 | Validation | Adding input/data validation |
| ✈️ | Offline support | Improving offline capabilities |
| 🥚 | Easter egg | Adding a hidden feature |

### Bug Fixes (fix)

| Emoji | Description | Use instead of 🐛 when... |
|-------|-------------|--------------------------|
| 🚑️ | Critical hotfix | Fix is urgent / production-breaking |
| 🔒️ | Fix security issues | Fix addresses a security vulnerability |
| 🚨 | Fix compiler/linter warnings | Fix is ONLY resolving warnings |
| 🩹 | Simple fix for non-critical issue | Trivial one-line fix |
| 🥅 | Catch errors | Adding error handling/boundaries |
| 👽️ | Update due to external API changes | Adapting to third-party API change |
| 💚 | Fix CI build | Fix is CI/build-specific |
| ✏️ | Fix typos | Fix is ONLY typo corrections |
| 🔥 | Remove code or files | Deleting unused code/files |
| 🔇 | Remove logs | Removing logging statements |

### Documentation (docs)

| Emoji | Description | Use instead of 📝 when... |
|-------|-------------|--------------------------|
| 💡 | Add or update comments in source code | Change is ONLY inline code comments |

### Style (style)

| Emoji | Description | Use instead of 💄 when... |
|-------|-------------|--------------------------|
| 🎨 | Improve structure/format of the code | Restructuring code layout for readability |

### Refactoring (refactor)

| Emoji | Description | Use instead of ♻️ when... |
|-------|-------------|--------------------------|
| 🚚 | Move or rename resources | Renaming/moving files or exports |
| 🏗️ | Architectural changes | Large-scale structural redesign |
| ⚰️ | Remove dead code | Deleting unreachable/unused code |

### Testing (test)

| Emoji | Description | Use instead of ✅ when... |
|-------|-------------|--------------------------|
| 🧪 | Add a failing test | Deliberately adding a red test |
| 🤡 | Mock things | Adding/updating test mocks/stubs |
| 📸 | Add or update snapshots | Snapshot-only updates |

### CI/CD (ci)

| Emoji | Description | Use instead of 🚀 when... |
|-------|-------------|--------------------------|
| 👷 | Add or update CI build system | Build system config changes |

### Chores (chore)

| Emoji | Description | Use instead of 🔧 when... |
|-------|-------------|--------------------------|
| ➕ | Add a dependency | Adding a new package/library |
| ➖ | Remove a dependency | Removing a package/library |
| 📌 | Pin dependencies to specific versions | Locking dependency versions |
| 📦️ | Add or update compiled files or packages | Build output or package changes |
| 🎉 | Begin a project | Initial project setup |
| 🔖 | Release / Version tags | Tagging a release version |
| 📄 | Add or update license | License file changes |
| 🙈 | Add or update .gitignore | Gitignore changes |
| 👥 | Add or update contributors | Contributors list updates |
| 🧑‍💻 | Improve developer experience | DX tooling improvements |
| 🌱 | Add or update seed files | Seed/fixture data |

### Other

| Emoji | Type | Description | When to use |
|-------|------|-------------|-------------|
| 🚧 | wip | Work in progress | Temporary checkpoint commit |
| 🍱 | assets | Add or update assets | Static assets (images, fonts, etc.) |
| 🗃️ | db | Database related changes | Schema migration or DB config |
| ⚗️ | experiment | Perform experiments | Experimental/exploratory code |
| 💫 | ui | Animations and transitions | Adding/updating UI animations |
| 🔀 | merge | Merge branches | Recording a branch merge |
