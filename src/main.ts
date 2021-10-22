import * as core from '@actions/core'
import {getDependencyGraph} from './get-dependency-graph'
import {getExecOutput} from '@actions/exec'

export async function run(): Promise<void> {
  try {
    const project: string = core.getInput('project')
    const base: string = core.getInput('base')
    const head: string | undefined = core.getInput('head') ?? undefined
    const usingGitFLow: boolean = core.getInput('gitflow')
      ? core.getInput('gitflow') === 'true'
      : false

    const extractList = (output: string): string[] => {
      const trimmed = output.trim()
      return trimmed.length === 0
        ? []
        : trimmed.split(' ').map(proj => proj.trim())
    }

    const getAffectedProjects = async (
      project_type: 'libs' | 'apps'
    ): Promise<string[]> => {
      const commandArgs = ['--plain']
      if (usingGitFLow) {
        const ref: string = process.env.GITHUB_REF!
        const commitSha: string = process.env.GITHUB_SHA!
        const isMasterOrDevelop = (): boolean =>
          ref === 'refs/heads/master' ||
          ref === 'refs/heads/main' ||
          ref === 'refs/heads/develop'
        if (isMasterOrDevelop()) {
          commandArgs.push('--base', `${commitSha}~1`, '--head', commitSha)
        } else {
          commandArgs.push('--base', 'origin/develop')
        }
      } else {
        if (base) {
          commandArgs.push('--base', base)
        }
        if (head) {
          commandArgs.push('--head', head)
        }
      }

      const affectedCommand = `npx nx affected:${project_type}`
      const affectedResult = await getExecOutput(affectedCommand, commandArgs, {
        silent: true
      })
      return extractList(affectedResult.stdout)
    }

    core.info('Getting list of affected projects using "nx affected".')
    // get the projects that are affected by the changes that happened since base (until head if provided)
    const allAffectedProjects = [
      ...(await getAffectedProjects('libs')),
      ...(await getAffectedProjects('apps'))
    ]

    core.info(`Getting dependencies of ${project} to filter by affected ones.`)
    // get the projects that are actually used by the provided project and filter them by affected projects
    const graph = await getDependencyGraph(project)
    const affectedDependencies = graph.nodes
      ? Object.keys(graph.nodes).filter(depName =>
          allAffectedProjects.includes(depName)
        )
      : []

    core.info('Setting outputs')
    core.setOutput('affectedDeps', affectedDependencies.join(','))
    core.setOutput('isAffected', affectedDependencies.length > 0)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
