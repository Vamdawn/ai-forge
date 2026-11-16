---
title: Prune Low-Value Unit Tests
description: Audit a unit-test suite, remove low-value checks, and verify that important behavior remains covered.
language: en
source: https://gist.github.com/lox/9ef443646a4f5a70eadcb09e9b872445
author: lox (@lox)
---

Prune low-signal unit tests aggressively. Agents often write tests that restate the implementation, always pass, break on every refactor, and add little protection beyond existing tests.

Prefer a smaller suite that protects behavior over a large suite that protects coverage numbers.

Keep a test only if all of these are true:

* It protects a specific observable behavior, invariant, or contract.
* There is a concrete, credible regression its assertions would detect.
* Its expected results are justified independently of the implementation under test.
* It adds meaningful value beyond other retained tests: a distinct failure mode, an important edge case, or substantially faster, more reliable, or more precise feedback.
* Its assertions would remain valid under a behavior-preserving refactor beneath the contract it protects. Routine changes to imports or setup do not count as invalidating its assertions.

Delete these:

* Tests that mirror implementation logic instead of checking intended behavior
* Coverage probes with no meaningful failure condition
* Source, import, or string greps used as a proxy for behavior, unless they enforce an explicit contract
* Mocks that implement the behavior being asserted
* Circular expectations computed using the same logic under test
* Tests whose only purpose is to keep a test-only export, wrapper, or seam alive
* Near-duplicates of stronger retained tests with no distinct protection or meaningful feedback advantage
* Development scaffolding that helped sketch an API or build an implementation but no longer protects a useful contract

Do not stop after a few easy deletions. Audit the whole unit-test suite. Aim to identify at least 20% worth removing, but do not manufacture deletions to meet a quota. If fewer qualify, explain why.

Read each candidate and its production owner before deleting it. When claiming another test makes it redundant, read that test too. Check its inputs, exercised behavior, and assertions. Similar names or overlapping line coverage do not establish equivalent protection. Where a consequential redundancy claim remains uncertain, introduce a representative fault to check it or retain the test and report the uncertainty.

Fan the audit across parallel subagents if useful, with non-overlapping areas. Reconcile against the final retained suite so two tests are not both deleted on the assumption that the other replaces them.

Establish baseline test results and available coverage using existing repo commands. After pruning, rerun affected tests and relevant integration/E2E suites. Compare coverage under the same settings. Investigate drops over 2 percentage points, but do not treat stable coverage as proof that protection was preserved.

Never delete or weaken a failing test merely to make the suite green. Record pre-existing failures. Investigate new failures in retained tests as possible product bugs.

Remove newly orphaned test-only helpers, exports, and wrappers after checking their consumers. Preserve runtime behavior and public APIs. Do not broaden this into a production refactor.

Merge these rules into AGENTS.md without duplicating or overwriting unrelated guidance:

* Before adding a test, identify the specific behavior, a credible mistake it should catch, and an independently justified expected result.
* Prefer small, fast, reliable tests whose failures identify the broken behavior. Use integration/E2E tests for interactions that isolated tests cannot establish.
* Do not reproduce implementation logic in assertions or mocks.
* Protect contracts, not incidental internal structure.
* Distinguish temporary development scaffolding from checks worth maintaining.
* Never delete or weaken a failing test just to make the suite pass.

When finished, report tests removed and grouped reasons, notable tests kept and why, production and test-support lines deleted, verification results, coverage before and after, and unresolved uncertainty.

Do not produce a per-test scorecard. Make the changes, verify them, and explain the consequential decisions.