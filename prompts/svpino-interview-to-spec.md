---
title: SVPino Interview-to-Spec Prompt
source: https://x.com/svpino/status/2045852437005869292
author: Santiago (@svpino)
type: prompt-template
language: en
---

# SVPino Interview-to-Spec Prompt

## 原始模板

```text
I want to build [ONE-LINE DESCRIPTION].

Interview me in detail. Cover implementation approach, edge cases,
tradeoffs, and constraints. Skip obvious
questions. Ask one at a time and build on my answers.

When we've covered everything, write the spec to [SPEC FILENAME]
```

## 可直接复用版本

```text
I want to build [ONE-LINE DESCRIPTION].

Interview me in detail. Cover implementation approach, edge cases,
tradeoffs, and constraints. Skip obvious questions.
Ask one question at a time and build on my answers.

When we've covered everything, write the spec to [SPEC FILENAME].
```

## 备注

- 这条推文的完整正文说明：作者先让 Claude 逐轮追问，再由 Claude 产出完整 spec，最后人工 review 和补充。
- 推文正文提到，这种方式通常能覆盖作者原本设想中的大约 90%，并暴露出许多事先没想到的细节。
