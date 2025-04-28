# GitHub Commit Guide for Cursor AI

## Why Structured Commits Matter

Structured commits are essential when collaborating with AI tools like Cursor AI for several important reasons:

1. **Traceable AI Contributions**: Clear commit messages help distinguish between human and AI-generated code, making it easier to trace and evaluate AI's impact on the project.

2. **Learning Acceleration**: When commit messages explicitly document AI assistance patterns, the team learns which types of tasks are most effectively delegated to AI.

3. **Quality Control**: Structured commits facilitate code reviews by highlighting the reasoning behind AI-generated code, enabling team members to more effectively validate AI outputs.

4. **Knowledge Transfer**: Well-documented commits create an organizational knowledge base of effective AI collaboration patterns that new team members can learn from.

5. **Continuous Improvement**: Analyzing commit patterns helps identify areas where AI excels or struggles, allowing teams to refine their AI collaboration strategies.

## What to Include in Commits

Each commit should encapsulate a single logical change and include the following elements:

### 1. Conventional Commit Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification with this structure:

```
<type>(<scope>): <short summary>

<body>

<footer>
```

### 2. Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Changes that don't affect code functionality (formatting, etc.)
- **refactor**: Code changes that neither fix bugs nor add features
- **perf**: Performance improvements
- **test**: Adding or correcting tests
- **build**: Changes to build system or dependencies
- **ci**: Changes to CI configuration files
- **chore**: Other changes that don't modify source or test files

### 3. AI-Specific Types

Add these types specifically for AI-assisted development:

- **ai-pair**: Code co-written with AI assistance
- **ai-refactor**: AI-driven code refactoring
- **ai-review**: Changes based on AI code review feedback
- **ai-test**: Tests generated or improved by AI
- **ai-docs**: Documentation created or enhanced by AI

### 4. Commit Body

In the commit body, include:

- What was changed and why
- How AI contributed (if applicable)
- Any deliberate deviations from AI suggestions
- References to related issues or tickets

### 5. Commit Footer

Use the footer for:

- Breaking changes (prefixed with `BREAKING CHANGE:`)
- References to GitHub issues (`Fixes #123`)
- AI tool and model information (`AI: Cursor AI with GPT-4`)

## How to Structure Your Workflow

### 1. Pre-Commit Phase

- **Plan Before Prompting**: Clearly define the task before engaging AI
- **Review AI Output**: Carefully review all AI-generated code before committing
- **Test Thoroughly**: Ensure AI-generated code passes all relevant tests
- **Understand the Code**: Never commit AI code you don't understand

### 2. Commit Authoring

- **Small, Focused Commits**: Keep commits small and focused on a single logical change
- **Be Explicit About AI's Role**: Clearly document where and how AI assisted
- **Describe Intent**: Explain the reasoning behind the changes
- **Include Context**: Reference relevant discussions, documentation, or issues

### A Sample Commit Process:

1. Stage your changes: `git add <files>`
2. Create a detailed commit message using the structured format
3. Commit your changes: `git commit -m "your structured message"`
4. Push to your branch: `git push origin <branch-name>`

## When to Commit

### Optimal Commit Points

1. **After Each Complete Feature**: Commit when a feature is functional and tested
2. **Following Logical Steps**: Break complex tasks into step-by-step commits
3. **After Successful AI Collaboration**: Commit immediately after a successful AI-human collaborative coding session
4. **Upon Refining AI Output**: Commit after improving or fixing AI-generated code
5. **When Switching Approaches**: Commit before trying a different approach with AI

### Timing Considerations

- **Frequent Small Commits**: Prefer frequent, small commits over large, infrequent ones
- **End-of-Session Commits**: Never end a work session without committing stable changes
- **Pre-Branch Switching**: Always commit before switching branches
- **After Test Success**: Commit after ensuring tests pass, not before

## Examples of Good Commit Messages

### Example 1: New Feature with AI Assistance

```
feat(auth): implement JWT token refresh mechanism

Implemented automatic JWT token refresh when tokens expire.
Used Cursor AI to help design the token rotation strategy and
security validation checks.

- Added RefreshTokenService with automatic expiry detection
- Implemented secure token storage with httpOnly cookies
- Added unit tests for token validation edge cases

AI: Cursor AI with Claude Opus
Fixes #142
```

### Example 2: AI-Assisted Bug Fix

```
fix(database): resolve connection pool exhaustion

Fixed database connection leaks that were causing pool exhaustion
under high load. AI identified the pattern of unclosed connections
in transaction error handling paths.

- Added connection cleanup in finally blocks
- Implemented timeout-based connection recovery
- Added monitoring for connection pool states

AI: Cursor AI with GPT-4
Fixes #219
```

### Example 3: AI-Generated Tests

```
ai-test(api): add comprehensive test suite for payment API

Generated test suite for the payment processing API endpoints.
AI created the test structure and edge cases, which I then
reviewed and modified for our specific implementation.

- Added 27 test cases covering success and failure paths
- Implemented mock payment provider responses
- Added load testing scenarios for concurrent transactions

AI: Cursor AI with Claude 3
Related to #198
```

## Reviewing AI-Assisted Commits

When reviewing commits that involved AI assistance:

1. **Verify Understanding**: Ensure the committer understood the AI-generated code
2. **Check for AI Biases**: Be alert for AI tendencies toward certain patterns
3. **Look for Missed Edge Cases**: AI may overlook important edge cases
4. **Validate Security Implications**: Carefully review security-critical code
5. **Confirm Testing Adequacy**: Ensure AI-generated tests are comprehensive

## Continuous Improvement

Regularly review and refine your AI commit practices:

1. **Team Retrospectives**: Discuss effective AI collaboration patterns
2. **Pattern Recognition**: Identify which types of tasks benefit most from AI
3. **Knowledge Sharing**: Document successful AI prompting strategies
4. **Tool Improvement**: Provide feedback to Cursor AI to improve the tool
5. **Process Refinement**: Adjust your commit guidelines as AI capabilities evolve

---

This guide is a living document. As AI capabilities and our collaborative practices evolve, we'll update these guidelines to reflect new best practices and lessons learned.
