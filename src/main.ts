import * as core from '@actions/core'
import {getDependencyGraph} from './get-dependency-graph'
import {getExecOutput} from '@actions/exec'

export async function run(): Promise<void> {
  try {
    const project: string = core.getInput('project')
    const base: string = core.getInput('base')
    const head: string | undefined = core.getInput('head') ?? undefined

    const extractList = (output: string): string[] => {
      const trimmed = output.trim()
      return trimmed.length === 0
        ? []
        : trimmed.split(' ').map(proj => proj.trim())
    }

    const getAffectedProjects = async (
      project_type: 'libs' | 'apps'
    ): Promise<string[]> => {
      const commandArgs = ['--base', base, '--plain']
      if (head) {
        commandArgs.push('--head', head)
      }

      const affectedCommand = `npx nx affected:${project_type}`
      const affectedResult = await getExecOutput(affectedCommand, commandArgs)
      return extractList(affectedResult.stdout)
    }

    // get the projects that are affected by the changes that happened since base (until head if provided)
    const allAffectedProjects = [
      ...(await getAffectedProjects('libs')),
      ...(await getAffectedProjects('apps'))
    ]

    // get the projects that are actually used by the provided project and filter them by affected projects
    const graph = await getDependencyGraph(project)
    const affectedDependencies = graph.nodes
      ? Object.keys(graph.nodes).filter(depName =>
          allAffectedProjects.includes(depName)
        )
      : []

    core.setOutput('affectedDeps', affectedDependencies.join(','))
    core.setOutput('isAffected', affectedDependencies.length > 0)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
