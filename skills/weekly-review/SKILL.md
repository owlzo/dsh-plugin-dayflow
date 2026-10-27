---
name: weekly-review
description: Review a week of the user's on-screen time from Dayflow: how it split across categories, how it compares with the week before, and what stands out. Use for weekly reviews, retros, and "how did my week go".
---

# Weekly review from Dayflow

1. Call `dayflow_weekly` for the week in question (pass any date inside it;
   weeks start Monday at 4 AM). Omit the date for the current week.
2. Call `dayflow_weekly` for the week before, so there is something to compare
   to.
3. For the two or three days that look most interesting, call
   `dayflow_timeline` to see what the time was actually spent on.

Then write a short review:

- Total tracked time and the split by category, with the change from the
  previous week where it is meaningful.
- The main things the user worked on, grouped by project rather than by day.
- One or two observations worth acting on, such as a day lost to context
  switching or a project that got less time than the user seems to want.

Stay with what the data shows. It covers time at this Mac, not time in the
world: a week with little tracked time can be a week of meetings, travel, or
leave, and the timeline cannot tell which. Say that plainly rather than reading
an absence as idleness.

Do not score the week or moralize about distraction time; report it plainly and
let the user decide what it means.
