import { Command } from 'commander'
import ora from 'ora'
import chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs'
import 'dotenv/config'
import {
  resolveTestFiles,
  loadAuthContexts,
  loadModuleContexts,
  loadConfig,
  parseFile,
  executeFile,
  formatJsonReport,
  formatJunitReport,
  type RunOptions,
  type AxtestConfig,
} from '@axtest/core'
import { printResults } from '../output/reporter.js'

export const runCommand = new Command('run')
  .description('Run axtest files')
  .argument('[path]', 'file or directory to run', '.')
  .option('-t, --test <id>', 'run a single test by ID')
  .option('--env <url>', 'base URL to test against')
  .option('--var <key=value...>', 'override variables (e.g. --var USERNAME=admin)')
  .option('--reporter <type>', 'output format: text, json, junit', 'text')
  .option('--bail', 'stop on first failure')
  .option('--headed', 'run browser in headed mode')
  .action(async (targetPath: string, opts: {
    test?: string
    env?: string
    var?: string[]
    reporter: string
    bail?: boolean
    headed?: boolean
  }) => {
    // Apply --var overrides to process.env
    if (opts.var) {
      for (const v of opts.var) {
        const eqIdx = v.indexOf('=')
        if (eqIdx !== -1) {
          process.env[v.slice(0, eqIdx)] = v.slice(eqIdx + 1)
        }
      }
    }

    const projectRoot = process.cwd()
    let testFiles: string[]

    try {
      testFiles = resolveTestFiles(path.resolve(targetPath))
    } catch {
      console.error(chalk.red(`Error: path not found: ${targetPath}`))
      process.exit(1)
    }

    if (testFiles.length === 0) {
      console.log(chalk.yellow('No .axtest files found.'))
      process.exit(0)
    }

    const config = loadConfig(projectRoot)
    const axtestConfig: Partial<AxtestConfig> = {}
    if (config['browser']) axtestConfig.browser = config['browser'] as AxtestConfig['browser']
    if (config['timeout']) axtestConfig.timeout = parseInt(config['timeout'], 10)
    if (config['screenshots']) axtestConfig.screenshots = config['screenshots'] as AxtestConfig['screenshots']

    const authContexts = loadAuthContexts(projectRoot)
    const moduleContexts = loadModuleContexts(projectRoot)

    const runOptions: RunOptions = {
      testId: opts.test,
      baseUrl: opts.env,
      bail: opts.bail,
      headed: opts.headed,
    }

    const spinner = ora({ color: 'cyan' })
    const allResults = []
    let hasFailures = false

    for (const file of testFiles) {
      const relPath = file.replace(projectRoot, '.').replace(/\\/g, '/')
      spinner.start(chalk.dim(relPath))

      try {
        const fileContext = parseFile(file)
        const result = await executeFile(fileContext, authContexts, moduleContexts, runOptions, axtestConfig)
        allResults.push(result)

        if (result.status === 'failed') {
          hasFailures = true
          spinner.fail(chalk.red(relPath))
        } else {
          spinner.succeed(chalk.dim(relPath))
        }
      } catch (err) {
        hasFailures = true
        spinner.fail(chalk.red(relPath))
        console.error(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`))
      }
    }

    // Output report
    if (opts.reporter === 'json') {
      console.log(formatJsonReport(allResults))
    } else if (opts.reporter === 'junit') {
      const outDir = path.join(projectRoot, 'results')
      fs.mkdirSync(outDir, { recursive: true })
      const outPath = path.join(outDir, 'results.xml')
      fs.writeFileSync(outPath, formatJunitReport(allResults))
      console.log(chalk.dim(`JUnit report written to ${outPath}`))
      printResults(allResults)
    } else {
      printResults(allResults)
    }

    process.exit(hasFailures ? 1 : 0)
  })
