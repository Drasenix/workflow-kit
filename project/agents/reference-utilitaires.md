# Référence : utilitaires et méthodes réutilisables

> Méthodes réutilisables du projet, et sources uniques à ne jamais réécrire : avant d'écrire une méthode, vérifier ici si l'équivalent existe.
> Lire l'index d'abord, puis les seuls blocs utiles. Tenu par le Build, sur accord explicite de l'utilisateur (cf. `workflow-kit/core/agent-build.md` § Fichiers meta).
> **Format** : `.agents/ecrire-un-utilitaire.md`

## Index

| Entrée | Domaine | Rôle |
|---|---|---|
| `<Nom>` | <Domaine> | <rôle en une ligne> |

---

## <Domaine>

### `<Nom>`
- **Fichier** : `<chemin/du/fichier>`
- **Type** : <facultatif : action, service, modèle, composant…>
- **Rôle** : <une phrase : ce que fait l'entrée, quand s'en servir>
- **Méthodes** :
  - `<methode>(<paramètres>): <retour>` : <ce qu'elle fait, en une phrase>
- **Ne pas réécrire** : <la règle dont l'entrée est la source unique, s'il y en a une>
- **Piège** : <ce qui casse si on l'utilise mal, s'il y a lieu>
- **Utilisé par** : `<Appelant>`
- **Référence** : `SP-…` · feature `<dossier/slug>`
