# Pomodoro Agent

Pomodoro Agent is a Slack-based task management system that combines the Pomodoro Technique with AI-powered task management. It helps you manage your time effectively by breaking down tasks and maintaining focus through structured work sessions.

## Features

- **AI-Powered Task Management**
  - Automatically breaks down large tasks into manageable chunks
  - Estimates task duration based on descriptions
  - Intelligent task prioritization based on deadlines
  - Context-aware task suggestions

- **Pomodoro Timer Integration**
  - Customizable work and break durations
  - Automatic session tracking
  - Daily session statistics
  - Context persistence between sessions

- **Project Management**
  - Multiple project support
  - Task categorization by project
  - Deadline tracking
  - Progress monitoring
  - Automated daily summaries

- **Slack Integration**
  - Natural language interaction
  - Real-time notifications
  - Task selection prompts between sessions
  - Interactive buttons for common actions
  - Channel-specific configurations

## Prerequisites

- Cloudflare account with Workers, D1, and KV enabled
- Slack workspace with admin permissions
- Node.js 18 or higher
- npm 7 or higher
- Anthropic API key

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

4. Set up Cloudflare services:
```bash
# Create a D1 database
wrangler d1 create pomodoro_agent

# Create KV namespace for context
wrangler kv:namespace create pomodoro_context
```

5. Configure the environment:
   - Copy `wrangler.toml.example` to `wrangler.toml`
   - Update the following in `wrangler.toml`:
     - `database_id`: Your D1 database ID
     - `SLACK_BOT_TOKEN`: Your Slack Bot User OAuth Token
     - `SLACK_SIGNING_SECRET`: Your Slack App Signing Secret
     - `ANTHROPIC_API_KEY`: Your Anthropic API key
     - `SLACK_CHANNEL_ID`: Your Slack channel ID
     - `pomodoro_context`: Your KV namespace ID

6. Initialize the database schema:
```bash
wrangler d1 execute pomodoro_agent --file=./schema.sql
```

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
- Configure context retention period

## Development

### Project Structure

```
/
├── src/
│   ├── index.ts            # Main application
│   ├── task.ts             # Task management
│   ├── pomodoro.ts         # Pomodoro management
│   ├── agent.ts            # Agent management
│   ├── ai.ts               # AI processing
│   ├── slack.ts            # Slack integration
│   ├── context-manager.ts  # Context management
│   ├── scheduled-summary.ts# Automated summaries
│   ├── slack-messenger.ts  # Slack message handling
│   └── types.ts            # Type definitions
├── schema.sql              # Database schema
├── package.json            # Project configuration
├── tsconfig.json           # TypeScript configuration
└── wrangler.toml.example   # Cloudflare Workers configuration template
```

### Development Workflow

1. Start development server:
```bash
npm run dev
```

2. Run linter:
```bash
npm run lint
```

3. Format code:
```bash
npm run format
```

4. Run type checking:
```bash
npm run check
```

### Testing

The project includes unit tests for core functionality. To run tests:
```bash
npm test
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
- [ ] Context-aware task suggestions
- [ ] Automated task decomposition

## Acknowledgments

- [Pomodoro Technique](https://francescocirillo.com/products/the-pomodoro-technique) by Francesco Cirillo
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Slack API](https://api.slack.com/)
- [Anthropic API](https://www.anthropic.com/)