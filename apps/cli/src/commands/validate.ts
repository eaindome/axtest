import { Command } from 'commander'
import chalk from 'chalk'
import * as path from 'path'
import { resolveTestFiles, parseFile, type ParseError } from '@axtest/core'

export const validateCommand = new Command('validate')
  .description('Validate .axtest files without running them')
  .argument('[path]', 'file or directory to validate', '.')
  .action(async (targetPath: string) => {
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

    let hasErrors = false

    for (const file of testFiles) {
      const relPath = file.replace(process.cwd(), '.').replace(/\\/g, '/')
      try {
        const ctx = parseFile(file)
        const testCount = ctx.tests.length
        console.log(chalk.green(`  ✓ ${relPath}`) + chalk.dim(`  (${testCount} test${testCount !== 1 ? 's' : ''})`))
      } catch (err) {
        hasErrors = true
        const msg = err instanceof Error ? err.message : String(err)
        console.log(chalk.red(`  ✗ ${relPath}`))
        console.log(chalk.dim(`    ${msg}`))
      }
    }

    console.log()
    if (hasErrors) {
      console.log(chalk.red('Validation failed.'))
      process.exit(1)
    } else {
      console.log(chalk.green(`All ${testFiles.length} file${testFiles.length !== 1 ? 's' : ''} valid.`))
    }
  })
