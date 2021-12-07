import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as dependencyGraph from '../src/get-dependency-graph'
import {run} from '../src/main'
import {jest, expect, test, beforeEach, afterEach} from '@jest/globals'
import {NxDependencyGraph} from '../src/get-dependency-graph'

type ActionInputs = {
  project: string
  base: string
  head?: string
}

interface ActionOutputs {
  isAffected?: boolean
  affectedDeps?: string
}

const project = 'pathfinder'
const developBase = 'origin/develop'

const defaultInputs = {project, base: developBase}

// Inputs for mock @actions/core
let inputs: ActionInputs = defaultInputs
let outputs: ActionOutputs = {}

beforeEach(() => {
  // Mock getInput
  jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
    // @ts-ignore
    return inputs[name]
  })

  // Mock setOutput
  jest
    .spyOn(core, 'setOutput')
    .mockImplementation((name: string, value: string) => {
      // @ts-ignore
      return (outputs[name] = value)
    })

  // Mock error/warning/info/debug
  jest.spyOn(core, 'error').mockImplementation(jest.fn())
  jest.spyOn(core, 'warning').mockImplementation(jest.fn())
  jest.spyOn(core, 'info').mockImplementation(jest.fn())
  jest.spyOn(core, 'debug').mockImplementation(jest.fn())

  // Reset inputs
  inputs = defaultInputs
  // Reset outputs
  outputs = {}
})

afterEach(() => {
  // Restore
  jest.clearAllMocks()
})

afterAll(() => {
  jest.restoreAllMocks()
})

describe('isAffected output', () => {
  it('is false when provided project is not affected', async () => {
    mockNxAffectedOutput('depOfOtherApp', 'otherApp')
    mockDependencyGraph([project, 'bar'])

    await run()

    expect(outputs.isAffected).toEqual(false)
  })

  it('is true when provided project is affected', async () => {
    mockNxAffectedOutput('', project)
    mockDependencyGraph([project]) // the dependencies in the "nx dep-graph" output of a project always also includes the project itself
  
    await run()
  
    expect(outputs.isAffected).toEqual(true)
  })

  it('is true when one of the dependencies of the provided project is affected', async () => {
    const projectDependency = 'bar';
    mockNxAffectedOutput(projectDependency, '')
    mockDependencyGraph([project, projectDependency])

    await run()

    expect(outputs.isAffected).toEqual(true)
  })
})

describe('affectedDeps output', () => {
  it('contains the provided project name', async () => {
    mockNxAffectedOutput('', project)
    mockDependencyGraph([project, 'bar'])

    await run()

    expect(outputs.affectedDeps).toEqual(`${project}`)
  })

  it('contains the affected dependencies of the provided project', async () => {
    const affectedDependencies = 'foo bar';
    const dependencies = affectedDependencies + ' baz'
    mockNxAffectedOutput(affectedDependencies, project)
    mockDependencyGraph([project, ...dependencies.split(' ')])

    await run()

    expect(outputs.affectedDeps).toEqual(`${project},${affectedDependencies.split(' ').join(',')}`)
  })
})

// TODO: add unit tests for gitflow parameter
test('sets the outputs isAffected and affectedDeps', async () => {
  const affectedSpy = mockNxAffectedOutput(project + ' foo bar baz')
  mockDependencyGraph([project, 'bar'])

  await run()

  expect(affectedSpy).toHaveBeenCalledTimes(2)
  expect(outputs.isAffected).toEqual(true)
  expect(outputs.affectedDeps).toEqual(`${project},bar`)
})

function mockDependencyGraph(dependencies: string[]) {
  const nodes = dependencies.reduce(
    (acc, dep) => ({...acc, [dep]: {type: 'lib', name: dep}}),
    {}
  )
  const mock = async (_project: string): Promise<NxDependencyGraph> => {
    return Promise.resolve({
      nodes
    })
  }
  jest.spyOn(dependencyGraph, 'getDependencyGraph').mockImplementation(mock)
}

function mockNxAffectedOutput(affectedLibsOutput: string, affectedAppsOutput: string = inputs.project) {
  const execSpy = jest.spyOn(exec, 'getExecOutput')
  execSpy.mockImplementation((command: string) => {
    if (command.includes('affected:apps')) {
      return Promise.resolve({
        exitCode: 0,
        stdout: affectedAppsOutput,
        stderr: ''
      })
    }

    return Promise.resolve({
      exitCode: 0,
      stdout: affectedLibsOutput,
      stderr: ''
    })
  })
  return execSpy
}
