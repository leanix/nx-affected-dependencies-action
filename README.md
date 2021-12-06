# nx-affected-dependencies-action

Are you deploying many different apps in your nx monorepo with dedicated workflows?

Are you looking for an alternative to `nx affected` that will only `lint` and `test` affected projects that are actually a dependency of the app you are deploying in one workflow?

Then this action is for you!

By combining `nx affected` and `nx dep-graph --focus=theNameOfTheAppToDeploy` we can create an intersection of these two lists to only get the affected projects that are actually a dependency of `theNameOfTheAppToDeploy`.

![Illustration of the different lists of projects produced by three commands](https://user-images.githubusercontent.com/46342664/144886209-755375b0-42a2-4532-9e8c-f9357b10795c.png)


## Usage:

### Using base and head parameters

When providing the `base` and `head` parameters to the workflow they are directly passed into [nx affected](https://nx.dev/l/r/cli/affected).

```
- name: Evaluate affected
  uses: leanix/nx-affected-dependencies-action@v0.2.1
  id: affected
  with:
    project: pathfinder
    base: ${{ github.sha }}~1
    head: ${{ github.sha }}

- name: Run Unit Tests (Affected)
  if: steps.affected.outputs.isAffected == 'true'
  env:
    affectedDeps: ${{ steps.affected.outputs.affectedDeps }}
  run: npx nx run-many --target=test --projects=$affectedDeps
```

#### Emulate git-flow

Here's a snippet to generate the `base` and `head` inputs for a repository that uses the `git-flow` branching strategy:
```
- name: Get parameters for nx-affected-dependencies-action
  id: affectedInputs
  run: |
    if ["${BRANCH##*/}" == "develop"] || ["${BRANCH##*/}" == "master"]; then
        echo "::set-output name=base::origin/develop"
        echo "::set-output name=head::"
    else
        echo "::set-output name=base::$COMMIT_SHA~1"
        echo "::set-output name=head::$COMMIT_SHA"
    fi
  env:
    BRANCH: ${{ github.ref }}
    COMMIT_SHA: ${{ github.sha }}
- name: Evaluate affected
  uses: leanix/nx-affected-dependencies-action@v0.2.1
  id: affected
  with:
    project: pathfinder
    base: ${{ steps.affectedInputs.outputs.base }}
    head: ${{ steps.affectedInputs.outputs.head }}
```

### Using gitflow parameter

Instead of emulating `git-flow` with `base` and `head` parameters you can also just set the `git-flow` workflow parameter to `true` and we'll handle it for you.

Like this:
```
- name: Evaluate affected
  uses: leanix/nx-affected-dependencies-action@v0.2.1
  id: affected
  with:
    project: pathfinder
    gitflow: true

- name: Run Unit Tests (Affected)
  if: steps.affected.outputs.isAffected == 'true'
  env:
    affectedDeps: ${{ steps.affected.outputs.affectedDeps }}
  run: npx nx run-many --target=test --projects=$affectedDeps
```

## Run tests

Execute `npm run test` to run unit tests with Jest.

## How to publish

Actions are run from GitHub repos so we will checkin the packed dist folder. 

Run the following commands to tag your new version.
```bash
$ npm run package
$ git add dist
$ git commit -a -m "Meaningful commit message"
$ git tag -a v0.x.x -m "Release 0.x.x"
```

Then draft a new release via the GitHub repository UI.

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

## Copyright and License

Copyright 2021 LeanIX GmbH, Bonn. Code released under [the MIT license](LICENSE).
