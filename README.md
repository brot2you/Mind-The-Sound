# Mind the Sound! — Beatbox City V2

Application éducative statique (HTML / CSS / JavaScript), adaptée aux collégiens. Elle fonctionne sans serveur applicatif sur GitHub Pages.

## Installation GitHub Pages

1. Créer un dépôt GitHub **mind-the-sound** (ou utiliser celui de la V1).
2. À la racine du dépôt, déposer **index.html**, **styles.css**, **data.js**, **app.js** et le dossier **assets/** complet. Ne déposer ni le ZIP lui-même ni le sous-dossier `__assets`.
3. Dans **Settings > Pages**, choisir **Deploy from a branch**, branche `main`, dossier `/(root)` et enregistrer.
4. Ouvrir le lien GitHub Pages. Si le site a déjà une V1, effectuer un rechargement forcé pour actualiser les fichiers CSS/JS.

Le dossier `assets` fourni avec cette V2 contient uniquement les images utilisées. Les noms des quartiers et le code Pxx sont générés en HTML : aucun texte n'est nécessaire dans le décor des quatre cartes.

## Fonctions et limites

- 32 codes de prononciation P01 à P32, regroupés en 4 familles.
- Parcours de 5 étapes : écouter, découvrir (question inductive + hypothèse personnelle facultative), comprendre, pratiquer, s'enregistrer.
- P11 /θ/ comprend des exemples supplémentaires et des conseils articulatoires spécifiques.
- Défis auditifs à 3 manches, avec variante visuelle pour P30 (accent contrastif impossible à synthétiser de façon fiable sur la même phrase).
- Enregistrement facultatif et lecture de l'essai via le micro ; aucune évaluation automatique de la voix.
- Espace professeur : codebook, liens directs, copie de codes et export CSV.
- Récompenses : 16 badges ; progression locale, XP et révisions espacées à J+1, J+3 et J+7.
- Compatible smartphones ; aucune bibliothèque JavaScript externe requise. Les polices Google Fonts ne sont qu'un raffinement facultatif.

**Audio** : dépend de la synthèse vocale anglais britannique (`SpeechSynthesis`) installée dans le navigateur. Pour obtenir un modèle réellement maîtrisé (notamment accent/intonation), remplacer à terme la synthèse vocale par des enregistrements de locuteurs.

**Confidentialité** : les enregistrements micro ne quittent pas le navigateur et sont temporaires (ils disparaissent à la navigation ou au rechargement). Seules les données de progression sont conservées en `localStorage` sur l'appareil.

**Remarque pédagogique** : réussir la discrimination ne démontre pas la maîtrise de la production. L'application marque des missions terminées, pas une compétence orale certifiée.

## Maintenance

- Ajouter/modifier les codes dans `data.js` (`window.SOUND_CODES`).
- Adapter les règles de badges et de révision dans `app.js`.
- Adapter les couleurs et la mise en page dans `styles.css`.
- Les quatre illustrations des quartiers sont recadrées pour supprimer les grands titres intégrés aux images ; les enseignes interactives sont du HTML lisible et modifiable.

© Brot2You — application éducative personnalisable.
