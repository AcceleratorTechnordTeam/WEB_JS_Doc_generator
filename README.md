# Générateur de documentation

Formulaire React + Vite qui génère une documentation standardisée en **Markdown** :

- **Fonction** — commentaire JSDoc (TypeScript) ou commentaires XML `///` (C#), plus une fiche de documentation.
- **Objet** — tableau des propriétés d'une interface / d'un type (TS) ou d'une classe / d'un record (C#).

Tout tourne dans le navigateur (brouillons et historique dans `localStorage`), sans backend.

## Développement

```bash
npm install
npm run dev
```

## Déploiement

Chaque push sur `main` déclenche [le workflow GitHub Actions](.github/workflows/deploy.yml) qui build le site et le publie sur **GitHub Pages**.

Prérequis (une seule fois) : dans le dépôt GitHub, **Settings → Pages → Build and deployment → Source : GitHub Actions**.
