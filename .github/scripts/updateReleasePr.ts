/*
***************************************!!!!!!!!!!!!!!!!!***************************************

Heads up, don't try to run this on your local machine as it will override your git environment!

***************************************!!!!!!!!!!!!!!!!!***************************************
*/

import {
  updateReleasePR,
  type ChangelogAdditionalContent,
} from '@conetecdataservices/buzzer.ci.common/changelog'
import { assertEnvVars } from '@conetecdataservices/buzzer.ci.common/common'

const env = assertEnvVars([
  'PR_RELEASE_BRANCH',
  'MAIN_BRANCH',
  'API_REPO_PATH',
  'GITHUB_TOKEN',
])

export function main(): Promise<unknown> {
  const customHeader: ChangelogAdditionalContent = (newVersionMeta) =>
    [
      `## 🤖 Beep Boop! I am tracking changes for release \`${newVersionMeta.semver.toString()}\` 🚀`,
      '> This changelog will update automatically as new commits are made.',
      "> Ready to release? Delete this header, then merge to master. I'll perform the following actions:",
      '> 1) Update the package version',
      '> 2) Publish a new package version in GitHub Packages.\n',
      `> [!NOTE]`,
      `> Feel free to add additional details to the release notes by editing the PR body. Edits made before the "Changelog" header will be preserved!`,
    ].join('\n')

  const customFooter: ChangelogAdditionalContent = (newVersionMeta) =>
    [
      '<hr />\n',
      '## ✨ Installing/Updating\n',
      '```ruby',
      `npm i -D @conetecdataservices/jspdf-autotable@${newVersionMeta.semver.toString()}`,
      '```\n',
      'See [jspdf-autotable](https://github.com/conetecdataservices/jspdf-autotable/pkgs/npm/jspdf-autotable) for details\n',
    ].join('\n')

  return updateReleasePR(
    {
      changelogConfigDir: `${process.cwd()}/.github/scripts`,
      versioningStrategy: 'semVer',
      changelogTextAdditions: {
        customHeader,
        customFooter,
      },
    },
    {
      envVars: env,
      packageLocations: ['./'],
    },
  )
}

main()
