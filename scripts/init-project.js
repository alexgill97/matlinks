const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Project directories to create
const directories = [
  'tasks',
  'app',
  'app/components',
  'app/layouts',
  'app/lib',
  'app/pages',
  'app/styles',
  'prisma',
  'public',
  'public/images',
];

// Create project directories
directories.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Create initial files
const filesToCreate = [
  {
    path: 'README.md',
    content: `# Matlinks

A modern gym management platform purpose-built for Brazilian Jiu-Jitsu (BJJ) academies.

## Features

- Membership Management
- Billing & Payments
- Attendance Tracking
- Class Scheduling & Booking
- Analytics & Reporting

## Tech Stack

- Next.js (Frontend)
- TypeScript
- Tailwind CSS (Styling)
- Supabase (Backend, Auth, Database)

## Getting Started

1. Clone the repository
2. Install dependencies: \`npm install\`
3. Set up environment variables (copy .env.example to .env.local)
4. Run the development server: \`npm run dev\`

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.
`
  },
  {
    path: '.env.example',
    content: `# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# App
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Email (optional)
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email-username
EMAIL_SERVER_PASSWORD=your-email-password
EMAIL_FROM=noreply@example.com
`
  },
  {
    path: '.gitignore',
    content: `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`
  },
  {
    path: 'prisma/schema.prisma',
    content: `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Schemas will be defined during implementation based on PRD
`
  },
  {
    path: 'tasks/initial-tasks.json',
    content: `{
  "project": {
    "name": "Matlinks",
    "description": "A modern gym management platform purpose-built for Brazilian Jiu-Jitsu (BJJ) academies",
    "version": "0.1.0"
  },
  "tasks": [
    {
      "id": "1",
      "title": "Project Setup",
      "description": "Initialize the project structure and configurations",
      "status": "pending",
      "dependencies": [],
      "priority": "high"
    },
    {
      "id": "2",
      "title": "Authentication System",
      "description": "Implement authentication with Supabase Auth",
      "status": "pending",
      "dependencies": ["1"],
      "priority": "high"
    },
    {
      "id": "3",
      "title": "Database Schema Design",
      "description": "Create database schema based on the PRD requirements",
      "status": "pending",
      "dependencies": ["1"],
      "priority": "high"
    },
    {
      "id": "4",
      "title": "User Management",
      "description": "Implement user and role management for different user types",
      "status": "pending",
      "dependencies": ["2", "3"],
      "priority": "high"
    }
  ]
}
`
  }
];

filesToCreate.forEach(file => {
  const filePath = path.join(process.cwd(), file.path);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, file.content);
    console.log(`Created file: ${file.path}`);
  }
});

console.log('Project structure initialized successfully!');
console.log('The PRD has been parsed and is now ready for development.');
console.log('Next steps:');
console.log('1. Review initial tasks in tasks/initial-tasks.json');
console.log('2. Update the package.json with required dependencies');
console.log('3. Run npm install to install dependencies');
console.log('4. Set up environment variables');
console.log('5. Start developing with npm run dev'); 