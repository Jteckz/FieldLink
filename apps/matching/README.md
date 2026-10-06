# matching  (Phase 2 - not installed yet)
Rule-based scoring service: course 30 / skills 30 / location 15 / level 10 / year 10 / preferences 5.
- Weights live in configuration, never hard-coded.
- Return `score` + human-readable `reasons`; persist as `MatchResult(algorithm_version=...)`.
- Matching NEVER decides eligibility. Eligibility stays explicit in
  `applications.services.eligibility_issues`.
Build after MVP validation, then add `"apps.matching"` to INSTALLED_APPS and `/api/v1/matches/`.
