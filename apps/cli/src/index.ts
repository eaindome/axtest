import { program } from 'commander'
import { runCommand } from './commands/run.js'
import { validateCommand } from './commands/validate.js'
import { initCommand } from './commands/init.js'

program
  .name('axtest')
  .description('Human-readable browser test automation')
  .version('0.1.0')

program.addCommand(runCommand)
program.addCommand(validateCommand)
program.addCommand(initCommand)

program.parse()
