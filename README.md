# Générateur de documentation

[![▶ Ouvrir l'outil](https://img.shields.io/badge/%E2%96%B6%20Ouvrir%20l'outil-6355F6?style=for-the-badge&logo=githubpages&logoColor=white)](https://acceleratortechnordteam.github.io/WEB_JS_Doc_generator/)

Outil React + Vite qui décrit un projet et exporte un **JSON final** standardisé. Un titre général, puis un onglet par catégorie :

- **Endpoints** — identifiant, nom, type (`standard` : payload en texte, `non-standard` : payload `assembly`, `action`, `configurations`, `applyAll`), méthode HTTP, URL.
- **Objets** — type TypeScript documenté en JSDoc (ou classe C# documentée en commentaires XML).
- **Fonctions** — commentaire TSDoc, avec le type des paramètres et du retour (`@param {string} nom`, `@returns {string | null}`) quand il est renseigné (ou commentaires XML `///` en C#), copiable seul.
- **Messages** — identifiant, type (`critical`, `error`, `warning`, `success`, `info`) et texte.

Format du JSON exporté :

```json
[
    { "title": "Declare Activity" },
    { "endpoint": [{ "requestId": "001", "endpointName": "Get activities", "type": "non-standard", "method": "POST", "endpoint": "url.example",
                    "payload": { "assembly": "…", "action": "…", "configurations": [{}], "applyAll": true } }] },
    { "object": [{ "objectId": "Object 01", "objectName": "Activity", "description": "…", "objectType": "{isOngoing: boolean;}" }] },
    { "functions": [{ "functionId": "FF01", "functionName": "maFonction()", "language": "TypeScript", "doc": "/** … */" }] },
    { "messages": [{ "messageId": "Message 01", "type": "error", "message": "…" }] }
]
```

Tout tourne dans le navigateur (projet en cours et projets enregistrés dans `localStorage`), sans backend.

### Réutiliser et modifier

- **⧉ Dupliquer** (objet ou fonction) : crée une copie juste après l'original, pour en faire une variante.
- **✎ Modifier** (panneau JSON) : édite le JSON à la main, puis **Appliquer** (ou Ctrl+Entrée) met à jour les onglets.
- **Importer** : recharge un `.json` exporté par l'outil. Les `objectType` (type TS ou classe C#) et les `doc` (TSDoc ou XML `///`) sont relus pour remplir les formulaires ; ce qui ne peut pas être relu est signalé.

## Développement

```bash
npm install
npm run dev
```

## Déploiement

Chaque push sur `main` déclenche [le workflow GitHub Actions](.github/workflows/deploy.yml) qui build le site et le publie sur **GitHub Pages**.

Prérequis (une seule fois) : dans le dépôt GitHub, **Settings → Pages → Build and deployment → Source : GitHub Actions**.
