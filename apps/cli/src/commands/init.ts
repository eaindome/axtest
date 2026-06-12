import { Command } from 'commander'
import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs'

const AXTEST_CONFIG_TEMPLATE = `# axtest configuration
# Override with --env flag or BASE_URL environment variable
base_url http://localhost:3000

# browser: chromium | firefox | webkit
browser chromium

# timeout in milliseconds
timeout 10000

# screenshots: on-failure | always | never
screenshots on-failure
`

const ENV_EXAMPLE_TEMPLATE = `# Base URL of your application
BASE_URL=http://localhost:3000

# Credentials for auth flows (reference with {{USERNAME}}, {{PASSWORD}})
USERNAME=admin@example.com
PASSWORD=password123
`

const EXAMPLE_AUTH_TEMPLATE = `AUTH admin

STEPS
  navigate /login
  type "Email" "{{USERNAME}}"
  type "Password" "{{PASSWORD}}"
  click "Sign In"

ASSERT
  url contains /dashboard
`

const EXAMPLE_TEST_TEMPLATE = `AUTH admin

TEST T-01 "Home page loads"
  STEPS
    navigate /
  ASSERT
    is visible "Welcome"
`

const GITIGNORE_ADDITIONS = `
# axtest
results/
results/screenshots/
`

export const initCommand = new Command('init')
  .description('Scaffold an axtest project in the current directory')
  .action(async () => {
    const cwd = process.cwd()

    const dirs = [
      path.join(cwd, 'auth'),
      path.join(cwd, 'modules'),
      path.join(cwd, 'tests'),
      path.join(cwd, 'results'),
    ]

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        console.log(chalk.dim(`  created  ${path.relative(cwd, dir)}/`))
      }
    }

    // axtest.config
    const configPath = path.join(cwd, 'axtest.config')
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, AXTEST_CONFIG_TEMPLATE)
      console.log(chalk.dim('  created  axtest.config'))
    }

    // .env.example
    const envPath = path.join(cwd, '.env.example')
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, ENV_EXAMPLE_TEMPLATE)
      console.log(chalk.dim('  created  .env.example'))
    }

    // example auth file
    const authFile = path.join(cwd, 'auth', 'admin.axtest')
    if (!fs.existsSync(authFile)) {
      fs.writeFileSync(authFile, EXAMPLE_AUTH_TEMPLATE)
      console.log(chalk.dim('  created  auth/admin.axtest'))
    }

    // example test file
    const testFile = path.join(cwd, 'tests', 'example.axtest')
    if (!fs.existsSync(testFile)) {
      fs.writeFileSync(testFile, EXAMPLE_TEST_TEMPLATE)
      console.log(chalk.dim('  created  tests/example.axtest'))
    }

    // Append to .gitignore if it exists
    const gitignorePath = path.join(cwd, '.gitignore')
    if (fs.existsSync(gitignorePath)) {
      const existing = fs.readFileSync(gitignorePath, 'utf-8')
      if (!existing.includes('results/')) {
        fs.appendFileSync(gitignorePath, GITIGNORE_ADDITIONS)
        console.log(chalk.dim('  updated  .gitignore'))
      }
    }

    console.log()
    console.log(chalk.green('✓ axtest project initialised'))
    console.log()
    console.log('Next steps:')
    console.log(`  1. Copy ${chalk.cyan('.env.example')} to ${chalk.cyan('.env')} and fill in your credentials`)
    console.log(`  2. Update ${chalk.cyan('auth/admin.axtest')} with your login flow`)
    console.log(`  3. Write tests in ${chalk.cyan('tests/')}`)
    console.log(`  4. Run ${chalk.cyan('axtest run')}`)
    console.log()
  })
