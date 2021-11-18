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

// TODO: add unit tests for gitflow parameter
// TODO: split into smaller unit tests
test('sets the outputs isAffected and affectedDeps', async () => {
  const affectedSpy = mockNxAffectedOutput(project + ' foo bar baz')
  mockDependencyGraph([project, 'bar'])

  await run()

  expect(affectedSpy).toHaveBeenCalledTimes(2)
  console.log('OUTPUTS', JSON.stringify(outputs))
  expect(outputs.isAffected).toEqual(true)
  expect(outputs.affectedDeps).toEqual(`${project},bar`)
})

test('sets isAffected to true when only the provided project is affected', async () => {
  mockNxAffectedOutput(project)
  mockDependencyGraph([project]) // the dependencies in the "nx dep-graph" output of a project always also includes the project itself

  await run()

  expect(outputs.isAffected).toEqual(true)
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

function mockNxAffectedOutput(affectedLibsOutput: string) {
  const execSpy = jest.spyOn(exec, 'getExecOutput')
  execSpy.mockImplementation((command: string) => {
    if (command.includes('affected:apps')) {
      return Promise.resolve({
        exitCode: 0,
        stdout: inputs.project,
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
