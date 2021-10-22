# nx-affected-dependencies-action

Are you deploying many different apps in your nx monorepo with dedicated workflows?

Are you looking for an alternative to `nx affected` that will only `lint` and `test` affected projects that are actually a dependency of the app you are deploying in one workflow?

Then this action is for you!

By combining `nx affected` and `nx dep-graph --focus=theNameOfTheAppToDeploy` we can create an intersection of these two lists to only get the affected projects that are actually a dependency of `theNameOfTheAppToDeploy`.

## Usage:

```
- name: Evaluate affected
  uses: konstantintieber/nx-affected-dependencies-action@main
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

## Run tests

Execute `npm run test` to run unit tests with Jest.

## How to publish

⚠️ WARNING: Just go with uses: `konstantintieber/nx-affected-dependencies-action@main` for now until we decide to start publishing versions.

Actions are run from GitHub repos so we will checkin the packed dist folder. 

Then run [ncc](https://github.com/zeit/ncc) and push the results:
```bash
$ npm run package
$ git add dist
$ git commit -a -m "prod dependencies"
$ git push origin releases/v1
```

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

## Copyright and License

Copyright 2021 LeanIX GmbH, Bonn. Code released under [the MIT license](LICENSE).