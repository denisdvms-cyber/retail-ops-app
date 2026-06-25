# Retail Ops

Staff operations app for store checks, temperature logs, visitor logs, age-check/refusal records, and Post Office duties.

## Run locally

```bash
npm start
```

Open:

```text
http://127.0.0.1:5173
```

Default staff PIN:

```text
2505
```

## Publish

Use a Node hosting service such as Render, Railway, Fly.io, or a VPS.

Start command:

```bash
npm start
```

The app uses `PORT` from the host automatically. Records are saved in `data.json` on the server.

For serious live use, move records from `data.json` to a managed database such as Supabase/Postgres so you have backups and safer long-term storage.
