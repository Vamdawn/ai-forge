# Version Files Reference

Complete detection and update reference for version files across ecosystems.

## Detection Table

| File | Ecosystem | Version Format | Priority |
|------|-----------|---------------|----------|
| `package.json` | Node.js | `"version": "x.y.z"` | High |
| `pyproject.toml` | Python (modern) | `version = "x.y.z"` | High |
| `Cargo.toml` | Rust | `version = "x.y.z"` | High |
| `pubspec.yaml` | Dart / Flutter | `version: x.y.z` | High |
| `pom.xml` | Java (Maven) | `<version>x.y.z</version>` | High |
| `build.gradle` | Java/Kotlin (Gradle) | `version = "x.y.z"` | High |
| `build.gradle.kts` | Kotlin (Gradle KTS) | `version = "x.y.z"` | High |
| `*.gemspec` | Ruby | `spec.version = "x.y.z"` | Medium |
| `setup.py` | Python (legacy) | `version="x.y.z"` | Medium |
| `setup.cfg` | Python (legacy) | `version = x.y.z` | Medium |
| `*.csproj` | .NET | `<Version>x.y.z</Version>` | Medium |
| `CMakeLists.txt` | C / C++ | `project(... VERSION x.y.z)` | Medium |
| `VERSION` | Universal | Plain version string | Low |

## Extraction & Update Patterns

### package.json (Node.js)

**Extract**: JSON field `"version"`
```
"version": "1.2.3"
```

**Update**: Replace the `"version"` field value using JSON-aware editing. Do NOT use regex replacement on the raw file — parse or use exact string match:
```
"version": "1.2.3"  →  "version": "1.3.0"
```

### pyproject.toml (Python)

**Extract**: Under `[project]` or `[tool.poetry]` section:
```toml
version = "1.2.3"
```

**Update**: Replace the version string in the correct section. Be careful:
- `[project]` section: standard PEP 621
- `[tool.poetry]` section: Poetry projects
- Do NOT modify `[tool.*.version]` in other tool configs

### Cargo.toml (Rust)

**Extract**: Under `[package]` section:
```toml
version = "1.2.3"
```

**Update**: Only modify version under `[package]`, never under `[dependencies]` or `[dev-dependencies]`.

### pubspec.yaml (Dart / Flutter)

**Extract**: Top-level `version` field:
```yaml
version: 1.2.3
```
Note: Flutter may use `version: 1.2.3+4` where `+4` is the build number. Preserve the build number format if present (increment build number alongside version).

**Update**: Replace version string, preserving build number format if used.

### pom.xml (Java Maven)

**Extract**: `<version>` that is a direct child of `<project>`:
```xml
<project>
  <version>1.2.3</version>
</project>
```

**Update**: ⚠️ **Critical** — Only update `<version>` that is a direct child of `<project>`. NEVER modify:
- `<parent><version>` (parent POM version)
- `<dependency><version>` (dependency versions)
- `<plugin><version>` (plugin versions)

Safe approach: Match the pattern `<project>...<version>x.y.z</version>` ensuring no nested element context.

### build.gradle / build.gradle.kts (Gradle)

**Extract**: Top-level `version` assignment:
```groovy
version = "1.2.3"       // Groovy DSL
version = "1.2.3"       // Kotlin DSL
```
Also check for:
```groovy
version "1.2.3"         // Groovy shorthand
```

**Update**: Replace the version string in the top-level assignment. Do not modify version strings inside `dependencies {}` blocks.

### *.gemspec (Ruby)

**Extract**:
```ruby
spec.version = "1.2.3"
# or
s.version = "1.2.3"
```

**Update**: Replace the version string in the assignment. Glob for `*.gemspec` in project root.

### setup.py (Python legacy)

**Extract**:
```python
version="1.2.3"
# or
version = "1.2.3"
```

**Update**: Replace the version string. May appear in `setup()` call or as a module-level variable.

### setup.cfg (Python legacy)

**Extract**: Under `[metadata]` section:
```ini
version = 1.2.3
```

**Update**: Replace version under `[metadata]` section only.

### *.csproj (.NET)

**Extract**:
```xml
<Version>1.2.3</Version>
```
Also check `<PackageVersion>` and `<AssemblyVersion>`.

**Update**: Update `<Version>` element. If `<PackageVersion>` or `<AssemblyVersion>` are also present, update them consistently.

### CMakeLists.txt (C / C++)

**Extract**:
```cmake
project(MyProject VERSION 1.2.3)
```

**Update**: Replace the version in the `project()` command. Preserve the project name and any other arguments.

### VERSION (Universal)

**Extract**: Plain text file containing only a version string:
```
1.2.3
```

**Update**: Replace entire file contents with the new version string (plus trailing newline).

## Edge Cases

### No Version File Found
If no version file is detected in the project root:
1. Ask the user which file(s) contain the version
2. If the user says "none", skip version file updates and only update CHANGELOGs

### Multiple Version Files
When multiple version files exist (e.g., `package.json` + `VERSION`):
- Update ALL detected version files to maintain consistency
- Show all files in the preview step for user confirmation

### Monorepo
If the project appears to be a monorepo (multiple `package.json` / `Cargo.toml` in subdirectories):
- Only update the ROOT version file(s)
- Warn the user that sub-package versions are not updated
- Suggest the user handle sub-packages separately

### Version Mismatch
If detected version files show different versions:
- Report the inconsistency to the user
- Ask which version to use as the baseline
- Update all files to the new calculated version
