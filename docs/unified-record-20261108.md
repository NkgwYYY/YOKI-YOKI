# One daily record form — 2026-11-08
- The first login/open of each day still opens the recording screen first.
- The record form is one continuous screen: mood, fatigue, worry, optional sleep/life/activity fields, then the existing Moyamoya picker last.
- One save commits all answers atomically. Moyamoya uses the existing matched-enemy encounter/battle flow; no new enemy selection or changes to battle rules.
- No Moyamoya goes home. The existing skip and same-day repeat prevention remain.
- Manual entry opens the same form. The exchange diary only edits prose and links to the shared form; it shows answers from the same daily record.
- Trends use real daily answers; sleep is bars, ordered answers lines, and categorical selections day grids. Missing values are never zero or “no”.
- “Changes” and “Insights” have distinct responsibilities. Preserve historical records and existing rewards.
- Visual concepts are illustrative, not proof of deployed functionality. Keep existing single-choice Moyamoya semantics (the generated mockup's multi-select caption is not a requirement).

## Changes prepared
The unified check-in owns all structured daily inputs. Diary prose stays separate, with an inline link to the same check-in; read-only details use the latest daily record. The record tab includes existing condition plots, sleep bars, Moyamoya/other ordered answers, day type, activity and Moyamoya-kind grids. Insight results retain counts and conservative comparison rules; the redundant mood chart is removed. Existing monthly export and saved hints retain their distinct purposes.

## Verification
A dedicated GitHub Actions workflow performs type checking, record/diary/reward/missing-value tests, web and iOS JS exports, and browser startup/form/chart scenarios. No native release is triggered by this feature branch. TestFlight build53 separately remains blocked by its native StoreKit price test; it must not be described as distributed.

## Optional activities update
“今日ここまでの過ごし方” can be left entirely unanswered; no extra confirmation is required. Show six shortcuts initially. “ほかの過ごし方も見る” expands six categories inline (food, time with people, outings/exercise, rest, enjoyment, work/daily life), showing only one category's choices at a time. Closing the chooser keeps selected choices visible. The catalogue has 34 choices including eating a lot, seeing a partner/friend, and busy work/study. Existing saved tags remain visible. Recorded choices feed the same graphs and conservative personal-observation logic; skipped answers stay unknown. The final Moyamoya question and first-login/battle flow are unchanged.
