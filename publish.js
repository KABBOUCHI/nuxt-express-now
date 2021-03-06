'use strict'

const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync
const semver = require('semver')
const inquirer = require('inquirer')
const shellQuote = require('shell-quote')

const createBump = ({
  remoteName = 'origin',
  prefix = ''
} = {}) => {
  const UsageError = class extends Error {
    constructor (message) {
      super(message)
      this.name = 'UsageError'
    }
  }

  return releaseType => {
    if (!releaseType) {
      console.error('Error: Release type not provided! ' +
        'Type `publish -h` for usage instructions.')
      process.exitCode = 1
      return
    }

    const getRootPath = () => run('git rev-parse --show-cdup').trim()
    const quote = string => shellQuote.quote([string])
    const run = (command, options) => execSync(command, { encoding: 'utf8', ...options })

    const getCurrentBranchName = () => {
      try {
        return run('git rev-parse --abbrev-ref HEAD').trim()
      } catch (error) {
        console.log(error)
        throw new UsageError('Git couldn\'t find current branch name')
      }
    }

    const getReleaseType = (currentBranch) => {
      if (currentBranch === 'master') {
        return 'prod'
      }

      if (currentBranch === 'staging') {
        return 'staging'
      }

      throw new UsageError('You need to be on master or staging branch to release')
    }

    const isPrerelease = !['major', 'minor', 'patch'].includes(releaseType)
    const branch = getCurrentBranchName()
    const releaseSuffix = getReleaseType(branch)
    const getNowConfigPath = () => path.join(process.cwd(), `${getRootPath()}${releaseSuffix}.now.json`)

    const getHashFor = branchName => {
      try {
        return run(`git rev-parse --verify ${quote(branchName)}`).trim()
      } catch (error) {
        throw new UsageError(`Git couldn't find the branch: "${
          branchName}"; please ensure it exists`)
      }
    }

    const ensureCleanBranch = () => {
      if (getHashFor('HEAD') !== getHashFor(branch)) {
        throw new UsageError(`You need to be on the "${
          branch}" branch to run this script`)
      }
      if (getHashFor(branch) !== getHashFor(`${remoteName}/${branch}`)) {
        throw new UsageError('You need to push your changes first')
      }
      if (run('git status -s').length) {
        throw new UsageError(
          'You have uncommited changes! Commit them before running this script')
      }
    }

    const writePackageJson = configObject =>
      fs.writeFileSync(getNowConfigPath(),
        `${JSON.stringify(configObject, null, 2)}\n`)
    const doBump = () => {
      const nowConfig = require(getNowConfigPath())
      const oldVersionFull = nowConfig.build.env.APP_VERSION
      const oldVersionForSemVer = nowConfig.build.env.APP_VERSION.replace(`-${releaseSuffix}`, '')

      // Create identifier like 1.0.0-staging or 1.0.0-prod
      const newStableVersion = `${semver.inc(oldVersionForSemVer, releaseType)}-${releaseSuffix}`
      nowConfig.build.env.APP_VERSION = newStableVersion
      nowConfig.env.APP_VERSION = newStableVersion

      // Add alias of the new version in case we need to revert
      const versionForAlias = newStableVersion.replace(/\./g, '-')
      nowConfig.alias[1] = nowConfig.alias[0].replace(releaseSuffix, versionForAlias)

      writePackageJson(nowConfig)

      // Tag a new release.
      console.log(`Version bumped from ${oldVersionFull} to ${newStableVersion}`)
      run(`git add ${quote(getNowConfigPath())}`)
      run(`git commit -m ${quote(`${prefix} Tag ${newStableVersion}`)}`)
      run(`git tag ${quote(newStableVersion)}`)

      // Bump to a new pre-release version but only if the version to publish is not
      // itself a pre-release; otherwise semver gets confused.
      // if (!isPrerelease) {
      // const newVersion = `${semver.inc(packageJson.version, 'patch')}${releaseSuffix}`

      // packageJson.version = newVersion
      // writePackageJson(packageJson)
      // run(`git add ${quote(getNowConfigPath())}`)
      // run(`git commit -m ${quote(`${prefix} Bump to ${packageJson.version}`)}`)
      // }

      const revertChanges = () => {
        run(`git tag -d ${quote(newStableVersion)}`)
        run(`git reset --hard ${quote(remoteName)}/${quote(branch)}`)
        console.log('Changes reverted')
      }

      // All public changes are done here.
      inquirer
        .prompt([{
          name: 'shouldProceed',
          type: 'confirm',
          message: 'Are you sure you want to publish the new version?'
        }])
        .then(answers => {
          if (answers.shouldProceed) {
            // Push & publish the tag.
            run(`git checkout ${quote(newStableVersion)}`, {
              stdio: [process.stdin, process.stdout, 'ignore']
            })
            run(`git push ${quote(remoteName)} ${quote(newStableVersion)}`)

            // Push the latest commit.
            run(`git checkout ${quote(branch)}`, {
              stdio: [process.stdin, process.stdout, 'ignore']
            })

            if (!isPrerelease) {
              // Force-update the date to prevent two commits having
              // the same time stamp.
              const commitMsg = run('git show -s --format=%s')
              run('git reset --soft HEAD^')
              run(`git commit -m ${quote(commitMsg)}`)
            }

            run(`git push ${quote(remoteName)} ${quote(branch)}`)
          } else {
            revertChanges()
          }
        })
        .catch(err => {
          console.error('error:', err)
          process.exitCode = 1
          revertChanges()
        })
    }

    ensureCleanBranch()
    doBump()
  }
}

module.exports = createBump()
module.exports.custom = createBump
