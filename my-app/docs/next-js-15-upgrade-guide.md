# Next.js 15 and React 19 Upgrade Guide

## Overview

This document outlines the process of upgrading our application from Next.js 14.1.3 to Next.js 15.2.1-canary.3 and React 19.0.0, including troubleshooting steps and solutions for common issues encountered during the upgrade process.

## Upgrade Process

### 1. Dependency Updates

We upgraded the following key dependencies:

```json
"next": "^15.2.1-canary.3",
"react": "^19.0.0",
"react-dom": "^19.0.0"
```

These packages leverage the latest features and performance improvements, including enhanced Turbopack support.

### 2. PostCSS Configuration for Tailwind CSS v4

With Tailwind CSS v4, the PostCSS plugin was moved to a separate package. We updated our PostCSS configuration to use this new package:

**Before:**

```js
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**After:**

```js
// postcss.config.mjs
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
```

### 3. Development Script Changes

We modified our development scripts to provide options for running with or without Turbopack:

```json
"scripts": {
  "dev": "next dev",
  "dev:turbo": "next dev --turbopack",
  "build": "next build",
  "start": "next start"
}
```

## Common Issues and Solutions

### 1. Turbopack Compatibility Issues

**Issue:** When running with `--turbopack` flag, the application failed to compile with the error:

```
Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. The PostCSS plugin has moved to a separate package...
```

**Solution:**

- Install the separate PostCSS plugin: `pnpm install @tailwindcss/postcss`
- Update PostCSS configuration as shown above
- Install autoprefixer: `pnpm install autoprefixer`

### 2. Dependency Resolution Conflicts on Vercel

**Issue:** After deploying to Vercel, the build process failed with the following error:

```
npm error ERESOLVE unable to resolve dependency tree
npm error Could not resolve dependency: peer next@">=15.0.0" from cookies-next@5.1.0
```

**Solution:**

1. Update the `vercel.json` configuration to use PNPM instead of NPM:

```json
{
  "buildCommand": "cd my-app && pnpm run build",
  "outputDirectory": "my-app/.next",
  "devCommand": "cd my-app && pnpm run dev",
  "installCommand": "cd my-app && pnpm install --no-frozen-lockfile",
  "framework": "nextjs"
}
```

2. Add a `.npmrc` file at the project root with:

```
auto-install-peers=true
```

3. Add a `pnpm-workspace.yaml` file at the project root with:

```yaml
packages:
  - "my-app"
```

### 3. Broken Lockfile Issues

**Issue:** When deploying to Vercel, we encountered lockfile inconsistencies:

```
ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with package.json
```

**Solution:** Added the `--no-frozen-lockfile` flag to the Vercel install command to ensure the lockfile is regenerated during deployment.

## Best Practices for Future Upgrades

1. **Always check for compatibility**: Before upgrading Next.js or React, check for compatibility with other dependencies, especially CSS frameworks.

2. **Update lockfiles after dependency changes**: Regenerate lockfiles after any dependency updates to prevent inconsistencies.

3. **Maintain CI/CD configuration**: Remember to update your Vercel configuration when changing package managers or adding significant dependencies.

4. **Test different environments**: Always test both development and production builds, with and without features like Turbopack.

5. **Maintain separate scripts**: Keep separate development scripts for standard and experimental features.

## Additional Resources

- [Next.js 15 Release Notes](https://nextjs.org/blog/next-15)
- [React 19 Release Notes](https://react.dev/blog/2024/03/26/react-19)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Vercel Deployment Configuration Guide](https://vercel.com/docs/projects/project-configuration)
