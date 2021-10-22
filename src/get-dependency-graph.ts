import {exec} from '@actions/exec'
import {resolve} from 'path'

export interface NxDependencyGraph {
  nodes: Record<string, {type: string; name: string}>
}

export async function getDependencyGraph(
  project: string
): Promise<NxDependencyGraph> {
  const depGraphFileName = 'nx_affected_dependencies_output.json'
  await exec(`npx nx dep-graph --focus=${project} --file=${depGraphFileName}`)
  const depGraphJson: {graph: NxDependencyGraph} = require(resolve(
    process.cwd(),
    `./${depGraphFileName}`
  ))
  const {graph} = depGraphJson
  return graph
}
