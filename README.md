# Pomodoro Agent

Pomodoro Agent is a Slack-based task management system that combines the Pomodoro Technique with AI-powered task management. It helps you manage your time effectively by breaking down tasks and maintaining focus through structured work sessions.

## Features

- **AI-Powered Task Management**
  - Automatically breaks down large tasks into manageable chunks
  - Estimates task duration based on descriptions
  - Intelligent task prioritization based on deadlines

- **Pomodoro Timer Integration**
  - Customizable work and break durations
  - Automatic session tracking
  - Daily session statistics

- **Project Management**
  - Multiple project support
  - Task categorization by project
  - Deadline tracking
  - Progress monitoring

- **Slack Integration**
  - Natural language interaction
  - Real-time notifications
  - Task selection prompts between sessions
  - Interactive buttons for common actions

## Prerequisites

- Cloudflare account with Workers and D1 enabled
- Slack workspace with admin permissions
- Node.js 18 or higher
- npm 7 or higher

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pomodoro-agent.git
cd pomodoro-agent
```

2. Install dependencies:
```bash
npm install
```

3. Create a Slack App:
   - Go to [Slack API](https://api.slack.com/apps)
   - Create a new app
   - Enable the following permissions under "Bot Token Scopes":
     - `chat:write`
     - `channels:history`
     - `app_mentions:read`
   - Install the app to your workspace
   - Copy the Bot User OAuth Token and Signing Secret

4. Set up Cloudflare D1:
```bash
# Create a D1 database
wrangler d1 create pomodoro_agent

# The command will output something like:
# ✓ Successfully created DB 'pomodoro_agent' in region APAC
# Created database 'pomodoro_agent' at ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

5. Configure the environment:
   - Copy `wrangler.toml.example` to `wrangler.toml`
   - Update the following in `wrangler.toml`:
     - `database_id`: Your D1 database ID from step 4
     - `SLACK_BOT_TOKEN`: Your Slack Bot User OAuth Token
     - `SLACK_SIGNING_SECRET`: Your Slack App Signing Secret

6. Initialize the database schema:
```bash
wrangler d1 execute pomodoro_agent --file=./schema.sql
```
Note: The .wrangler directory will be created locally for development purposes. This directory contains local database copies and should not be committed to version control.

7. Deploy the worker:
```bash
npm run deploy
```

## Usage

### Basic Commands

1. Create a new project:
```
@PomodoroAgent create new project
Project name: Web Development
Description: New service development project
Deadline: 2024-03-31
```

2. Add a task:
```
@PomodoroAgent add task
Project: Web Development
Task: Implement login feature
Description: Create user authentication system
Deadline: 2024-02-15
```

3. Start a Pomodoro session:
```
@PomodoroAgent start pomodoro
Task: Implement login feature
Work time: 25
Break time: 5
```

### Custom Settings

You can customize various settings through chat commands:

- Change default work/break durations
- Adjust notification preferences
- Modify task prioritization rules

### Task Management

The agent will:
- Track task progress
- Suggest next tasks based on priority
- Provide daily and weekly summaries
- Alert you about approaching deadlines

## Development

### Project Structure

```
/
├── src/
│   ├── index.ts        # Main application
│   ├── task.ts         # Task management
│   ├── pomodoro.ts     # Pomodoro management
│   ├── agent.ts        # Agent management
│   ├── ai.ts           # AI processing
│   └── slack.ts        # Slack integration
├── schema.sql          # Database schema
├── package.json        # Project configuration
├── tsconfig.json       # TypeScript configuration
└── wrangler.toml.example # Cloudflare Workers configuration template
```

### Database Schema

The application uses Cloudflare D1 with the following schema:

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  deadline TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  deadline TEXT,
  estimated_minutes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE pomodoro_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  work_minutes INTEGER NOT NULL,
  break_minutes INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE daily_records (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  completed_sessions INTEGER NOT NULL DEFAULT 0
);
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please:
1. Check the [Issues](https://github.com/yourusername/pomodoro-agent/issues) page
2. Open a new issue if your problem hasn't been reported
3. Provide as much context as possible

## Roadmap

- [ ] Multiple language support
- [ ] Team collaboration features
- [ ] Advanced analytics and reporting
- [ ] Calendar integration
- [ ] Custom AI models for better task estimation

## Acknowledgments

- [Pomodoro Technique](https://francescocirillo.com/products/the-pomodoro-technique) by Francesco Cirillo
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Slack API](https://api.slack.com/)