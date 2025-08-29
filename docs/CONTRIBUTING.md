# Contributing to Godam Chrome Extension

Thank you for your interest in contributing! Here are some guidelines to help you get started.

## How to Contribute

### Feature Requests
Feature requests are very welcome! But take a moment to find out whether your idea fits with the scope and aims of the project. It's up to you to make a strong case to convince the project's developers of the merits of this feature. Please provide as much detail and context as possible.

Building something great means choosing features carefully especially because it is much, much easier to add features than it is to take them away. Additions to GoDAM chrome extension will be evaluated on a combination of scope (how well it fits into the project), maintenance burden and general usefulness to users.

### Pull Requests
Good pull requests — patches, improvements, new features — are a fantastic help. They should remain focused in scope and avoid containing unrelated commits.

Please ask first before embarking on any significant pull request (e.g. implementing features, refactoring code), otherwise you risk spending a lot of time working on something that the project's developers might not want to merge into the project. You can solicit feedback and opinions in an open enhancement issue, or create a new one.

Please use the git flow for pull requests and follow WordPress Coding Standards before submitting your work.

Git Flow for Pull Requests
Fork the project, clone your fork, and configure the remotes:

# Clone your fork of the repo into the current directory
git clone git@github.com:<YOUR_USERNAME>/godam-chrome-extension.git
# Navigate to the newly cloned directory
cd godam-crome-extension
# Assign the original repo to a remote called "upstream"
git remote add upstream https://github.com/rtcamp/godam-chrome-extension
If you cloned a while ago, get the latest changes from upstream:

git checkout develop
git pull upstream master
Create a new topic branch (off the develop branch) to contain your feature, change, or fix:

git checkout -b <topic-branch-name>
Commit your changes in logical chunks. Please adhere to [these](https://www.conventionalcommits.org/en/v1.0.0/) git commit message guidelines. Use Git's interactive rebase feature to tidy up your commits before making them public. 

Locally merge (or rebase) the upstream development branch into your topic branch:

git pull [--rebase] upstream develop
Push your topic branch up to your fork:

git push origin <topic-branch-name>
Open a Pull Request (with a clear title and description) to the develop branch.

## Reporting Issues

- Use [GitHub Issues](https://github.com/rtCamp/godam-chrome-extension/issues) to report bugs or request features.
- Provide steps to reproduce, expected behavior, and screenshots if possible.


---

Thank you for helping improve Godam Chrome Extension!