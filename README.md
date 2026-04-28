# 0docs

0docs is a visual documentation builder inspired by Mintlify: project workspaces, a dense navigation tree, design controls, code view, and docs-as-code publishing.

## Project info

**Lovable project ID**: 3c397bbe-104a-466c-b9a2-4dfe441b0bbf

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Self-hosting

Phase 5 adds Docker/Railway scaffolding and runtime configuration support.

- Start here: [`SELF_HOSTING.md`](./SELF_HOSTING.md)
- Docker: [`DEPLOY_DOCKER.md`](./DEPLOY_DOCKER.md)
- Railway: [`DEPLOY_RAILWAY.md`](./DEPLOY_RAILWAY.md)
- Runtime config template: [`public/config.example.json`](./public/config.example.json)

## How can I deploy this project?

In Lovable, use Share -> Publish. For self-hosting, build the Docker image and provide the runtime backend variables described above.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
