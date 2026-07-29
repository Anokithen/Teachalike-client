# UI redesign notes

The frontend now uses a light-first TeachAlike clay/neumorphic visual system with a floating responsive shell, rounded surfaces, pastel states, and shared responsive controls. Existing API calls, auth checks, route behavior, recording, reading, games, and CRUD flows were kept intact.

The leaderboard derives reader count, total points, longest streak, and top score from the API response. Avatars remain initials when the leaderboard response does not include a child image URL; no demo data is injected.

No backend behavior was changed. The backend currently does not expose achievement badge metadata or aggregate leaderboard statistics, so badge labels are neutral derived presentation labels and summary values are calculated from returned entries.
