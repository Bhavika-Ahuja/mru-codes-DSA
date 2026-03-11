DSA Quiz project

## Code execution (IDE / Run Code)

The in-app IDE uses a configurable backend (the public Piston API is now whitelist-only). Configure **one** of the following:

### Option 1: JDoodle (free)

1. Sign up at [jdoodle.com](https://www.jdoodle.com/) and get your API credentials.
2. Add to `.env`:
   ```
   JDOODLE_CLIENT_ID=your_client_id
   JDOODLE_CLIENT_SECRET=your_client_secret
   ```
   Free tier: 20 runs/day.

### Option 2: Self-hosted Piston

If you run your own [Piston](https://github.com/engineer-man/piston) instance:

```
CODE_EXECUTION_URL=https://your-piston-server.example.com/api/v2/execute
```

Use the same path as the public API (e.g. `/api/v2/execute` or `/api/v2/piston/execute` depending on your deployment).
