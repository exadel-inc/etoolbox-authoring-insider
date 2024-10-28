# Contributing to EToolbox Authoring Insider
Contributions to EToolbox Authoring Insider are welcomed and greatly appreciated. We want to make contributing to this project as easy and transparent as possible, whether it is:
- Reporting a bug;
- Proposing new features;
- Discussing the current state of the code;
- Submitting a fix or solutions;
- Becoming a maintainer.

## We develop with Github
We use Github to host code, track issues, accumulate feature requests, review and accept pull requests.

## We use Github Flow
All code changes happen through Pull Requests.

Pull requests are the best way to propose changes to the codebase (please follow this guide [Github Flow](https://guides.github.com/introduction/flow/index.html)).

We actively welcome your pull requests:
1. Fork the repo and create your branch from `develop`.
2. Do code changes. Whenever you create new files, add the "Licenced under the Apache Licence..." header (use any of the existing files to copy the full header). Whenever you create new public or package-level methods, add Javadoc / JSDoc. Alter existing Javadoc / JSDoc if you change a method's signature.
3. If you've added code that should be tested, add unit tests under the _test_ folder of the respective module. Make sure that the tests pass.
4. If your code covers the features that cannot be verified without live connectivity to an AEM server or a 3rd party service, add an integration test under the _it.tests_ module. Make sure that the tests pass.
5. Make sure your code lints.
6. Issue the pull request.

#### Procedural pull request questions

Every pull request is dedicated to a single Github issue. Every issue has a tracking number like `EAI-333`.

A branch for the pull request must be named in the format `bugfix/EAI-333` or `feature/EAI-333` where the part before the slash is the kind of PR (reflecting a bug or a feature request, respectively), and the part after the slash in the tracking number.

A pull request's title must start with the tracking number in square brackets; then comes a brief but detailed description of what is done in this PR like `[EAI-333] Fixed NPE when saving file to a removable media`.

A more verbose description in the "description" section is optional but welcomed. You can assign labels from the provided set, such as `bug`, `enhancement`, `documentation`, etc.

Every pull request consists of one or more commits. Commit messages must be presented in the same format as the pull request title. E.g., the following 3 commits: `[EAI-333] Implemented the NPE fix... [EAI-333] Altered Javadoc for the affected method... [EAI-333] Added a unit test for the NPE fix`.

## Licensing
Any contributions you make are understood to be under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0) that covers the whole project. Feel free to contact the maintainers if that's a concern.

After creating your first pull request, you will be asked to sign our [Contributor License Agreement](../../Java/etoolbox-anydiff/CLA.md) by commenting on your PR with a special message.

## Bug reporting
We use Github's [issues](https://github.com/exadel-inc/etoolbox-authoring-kit/issues) to track public bugs.
Report a bug by opening a new issue.

#### Write bug reports with detail
[This is an template of bug report](https://github.com/exadel-inc/repository-template/blob/main/.github/ISSUE_TEMPLATE/bug_report.md).

## Use a Compliant and Consistent Coding Style

#### For POM files

* We place dependencies in the alphabetic order of their `groupId`-s except for the `uber-jar` that comes last to allow overlaying bundled dependencies.
* Use `dependencyManagement` / `pluginManagement` sections of the main POM to specify the common requisites, scope, and config values of dependencies. Override them in a dependent POM file only if necessary.

#### For code

* In Java code, stick to the [Code Conventions for the Java Programming Language](https://www.oracle.com/java/technologies/javase/codeconventions-contents.html) and also to the [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html) in essential parts.
* In JS code, use the predefined [ESLint](ui.apps/eslint.config.js) rules to verify code with an IDE such as IntelliJ.
* When unsure, follow the style of the existing code files.

#### For XML markup files

* Use proper indentation.
* Split long lines into smaller ones by attributes.
* When unsure, follow the style of the existing code files.

## Community and behavioral expectations

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

We expect contributors, reviewers, and participants to express their opinions in a friendly, polite, and clear manner, raise and address issues in most precise, explaining and accurate sentences.

We pledge to act and interact in ways that contribute to an open, welcoming, diverse, inclusive, and healthy community.
