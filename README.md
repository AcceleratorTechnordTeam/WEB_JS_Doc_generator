# Générateur de documentation

[![▶ Ouvrir l'outil](https://img.shields.io/badge/%E2%96%B6%20Ouvrir%20l'outil-6355F6?style=for-the-badge&logo=githubpages&logoColor=white)](https://acceleratortechnordteam.github.io/WEB_JS_Doc_generator/)

Formulaire React + Vite qui génère une documentation standardisée :

- **Fonction** — commentaire TSDoc/JSDoc (TypeScript) ou commentaires XML `///` (C#), prêt à coller au-dessus de la fonction.
- **Objet** — type TypeScript documenté en JSDoc (`export type …`) ou classe C# documentée en commentaires XML.

Tout tourne dans le navigateur (brouillons et historique dans `localStorage`), sans backend.

## Développement

```bash
npm install
npm run dev
```

## Déploiement

Chaque push sur `main` déclenche [le workflow GitHub Actions](.github/workflows/deploy.yml) qui build le site et le publie sur **GitHub Pages**.

Prérequis (une seule fois) : dans le dépôt GitHub, **Settings → Pages → Build and deployment → Source : GitHub Actions**.
