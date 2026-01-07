# DSA Learning & Assessment Platform

A comprehensive platform for students to learn Data Structures and Algorithms, complete assignments, and participate in live synchronized quizzes hosted by teachers.

## Features

### 🎓 For Students
- **Structured Learning**: Browse DSA topics with markdown-rendered content and syntax-highlighted code examples
- **Assignments**: Submit coding solutions and track your progress
- **Live Quizzes**: Join real-time quiz sessions with your classmates
- **Leaderboards**: Compete for top rankings globally and within your section

### 👨‍🏫 For Teachers
- **Course Management**: Create and organize DSA courseware
- **Assignment System**: Post assignments and grade student submissions
- **AI-Powered Quiz Generation**: Generate MCQs using Google Gemini for any DSA topic
- **Live Quiz Hosting**: Control quiz sessions in real-time with synchronized student views
- **Analytics**: Track student performance across sections

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend/Database**: Supabase (PostgreSQL, Auth, Realtime)
- **AI Integration**: Google Gemini API
- **State Management**: TanStack Query + Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A Supabase account
- A Gemini API key (for AI question generation)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Supabase + Prisma

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > Database and copy:
   - **Connection string** (for `DATABASE_URL`)
   - **Direct connection** string (for `DIRECT_URL`)
3. Copy your project URL and anon key from Project Settings > API

### 3. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Prisma Database (from Supabase connection settings)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# AI
GEMINI_API_KEY=your-gemini-api-key
```

### 4. Push Database Schema

```bash
pnpm db:push
```

### 5. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/         # Protected dashboard pages
│   │   ├── dashboard/       # Main dashboard
│   │   ├── learn/           # Learning module
│   │   ├── assignments/     # Assignment system
│   │   ├── quiz/            # Quiz system
│   │   └── leaderboard/     # Rankings
│   └── api/                 # API routes
│       └── ai/              # AI question generation
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── dashboard/           # Dashboard components
├── hooks/                   # Custom React hooks
├── lib/
│   ├── supabase/           # Supabase client helpers
│   ├── database.types.ts   # TypeScript types
│   └── utils.ts            # Utility functions
├── providers/               # React context providers
├── store/                   # Zustand stores
├── types/                   # TypeScript type definitions
└── supabase/
    └── schema.sql          # Database schema
```

## Database Schema

The platform uses the following main tables:

- `profiles` - User profiles linked to Supabase Auth
- `courses` / `lessons` - Learning content
- `assignments` / `assignment_submissions` - Assignment system
- `quizzes` / `questions` / `question_options` - Quiz content
- `quiz_sessions` / `session_participants` / `quiz_answers` - Live quiz state

See `supabase/schema.sql` for the complete schema with RLS policies.

## Key Features Implementation

### Live Quiz Engine

The live quiz system uses Supabase Realtime for synchronization:

1. Teacher creates a quiz session with a unique room code
2. Students join using the room code
3. Teacher controls quiz progression (start, next question, end)
4. All state changes are broadcast to participants in real-time
5. Leaderboard updates after each question

### AI Question Generation

Teachers can generate quiz questions by:

1. Entering a DSA topic (e.g., "Binary Search Trees")
2. Selecting difficulty level
3. Specifying number of questions
4. The system calls Gemini API to generate MCQs with explanations
5. Teacher reviews and edits before adding to quiz

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app can be deployed to any platform supporting Next.js:
- Netlify
- Railway
- AWS Amplify
- Self-hosted with `pnpm build && pnpm start`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this for your college or educational institution.

## Support

For issues and feature requests, please open a GitHub issue.
