# Glaunch

Glaunch is a student-focused career platform built with Next.js, Clerk authentication, and DynamoDB. It includes onboarding, resume analysis, AI-powered job matching, interview coaching, and live job syncing.

## Key features

- User onboarding with profile completion checks and onboarding redirect middleware
- Searchable university picker during onboarding
- Resume analysis with AI-assisted JSON output and profile scoring
- Job match generation with AI and deduplicated live job sync from Remotive and Jobicy
- Interview question generation and answer scoring
- OpenRouter fallback for AI requests when Bedrock is unavailable

## Local development

Install dependencies and run the dev server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

The app uses these environment variables:

- `DYNAMODB_TABLE_NAME` — DynamoDB table name
- `AWS_REGION` — AWS region (defaults to `us-east-1`)
- `AWS_ROLE_ARN` — optional AWS role ARN for Vercel OIDC credentials
- `OPENROUTER_API_KEY` — API key for OpenRouter fallback
- `NEXT_PUBLIC_APP_URL` — public app URL for internal API calls (optional)

## Important routes

- `POST /api/user/onboarding` — create or update user onboarding profile
- `GET /api/user/profile` — profile status used by middleware
- `POST /api/resume/analyze` — analyze uploaded resume via AI
- `POST /api/matches/generate` — generate job matches for the user
- `POST /api/interview/questions` — generate interview questions
- `POST /api/interview/score` — score interview answers
- `POST /api/jobs/sync` — sync live jobs from external sources

## Notes

- The onboarding flow redirects users to `/onboarding` until `profileComplete` reaches the required threshold.
- The AI layer first attempts AWS Bedrock, then OpenRouter free tier, and finally uses local deterministic fallbacks.
- Live jobs are fetched from Remotive and Jobicy and deduplicated by URL.
