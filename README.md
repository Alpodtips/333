# 333 API

API de départ basée sur NestJS, prête à accueillir l'authentification et la couche Prisma.

## Démarrer

```bash
npm install
npm run start:dev
```

L'API écoute sur `http://localhost:3000` par défaut. La variable `PORT` permet de changer le port.

## Vérifier l'état de l'API

```bash
curl http://localhost:3000/health
```

Réponse attendue :

```json
{
	"status": "ok",
	"service": "333-api"
}
```

## Scripts

- `npm run start:dev` : lance le serveur en mode développement
- `npm run start:prod` : lance le build de production
- `npm run build` : compile l'application dans `dist/`
- `npm run typecheck` : vérifie les types sans générer de fichiers

## Déployer sur Render

Le fichier `render.yaml` configure un service web Docker avec `/health` comme health check.

1. Pousse le dépôt sur GitHub.
2. Dans Render, choisis **New > Blueprint** et sélectionne ce dépôt.
3. Render détectera `render.yaml`, construira le Dockerfile et fournira l'URL publique.

Le port est fourni automatiquement par Render via la variable `PORT`.