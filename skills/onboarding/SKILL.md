---
name: onboarding
description: Check that Dayflow is installed and recording, then summarize the user's day. Use when the user asks to set up Dayflow or wants to see the timeline work.
---

# Set up Dayflow

Call `dayflow_status`. It answers even when Dayflow is absent: `setup.ready`,
`setup.missing`, `setup.install_command`, and `database_present` describe what is
left to do.

## When `setup.ready` is false

Walk the user through `setup.missing` in order, one step per message.

- **`install-app` first.** Say what is missing and offer to install it. Do not
  install anything until the user explicitly agrees in this conversation — an
  earlier "set it up" is not consent for a machine change.
  - If `dayflow_install_dayflow` is available and the user agrees, call it with
    `confirm: true`. Report the outcome honestly: on success, continue with the
    next step; on failure, give them `setup.install_command` (or
    `setup.download_url` when Homebrew is missing) and stop.
  - If that tool is not available, hand them `setup.install_command`, or the
    download page when `homebrew_installed` is false, and stop. Never claim the
    plugin installed it.
- **`open-app`** — ask them to open Dayflow from Applications.
- **`grant-permission`** — Dayflow needs Screen & System Audio Recording; they
  grant it, not you.
- **`choose-provider`** — local models (Ollama, LM Studio) or a cloud provider.
- **`record`** — tell them to let it run about fifteen minutes, then come back.

Stop after the failed or pending step. Do not summarise a day that has no data.

## When `setup.ready` is true

- If `last_capture_at` is more than an hour old, mention that recording looks
  paused and that they can resume it from Dayflow's menu bar icon.
- If `pending_batches` is above zero, mention that recent time is still being
  analyzed and will appear shortly.

Then call `dayflow_timeline` with no date and give the user a three or four line
summary of their day so far, so they see it working. Tell them what they can ask
for next: where their time went, a standup, or a weekly review.

If `edits_enabled` is false, mention once that this plugin can only read the
timeline until they turn on edits in Dayflow under Settings, AI Tools. If they
installed the plugin during an existing task, continue that task.
