
# Docker (Part 2)

## Construire une image

La construction d'une nouvelle image se fait à partir des informations
contenues dans un fichier spécial `Dockerfile`. Ce fichier décrit la construction, étape par étape, de l'image. Chaque étape va généralement
construire une couche du système de fichiers.  

Chaque ligne du fichier `Dockerfile` est une commande. Une commande
démarre par un mot clé (`FROM`, `COPY`, `RUN`, etc.) suivit des arguments
spécifique à chaque commande. 

Pour commencer créer un nouveau répertoire :
```
% mkdir my-app
% cd my-app
```

Créer un fichier `Dockerfile` contenant :
```
FROM java:8u111-jdk-alpine 
```

Lancer la construction de l'image :
```
% docker build -t my-app .
```

Le `.` indique qu'il faut construire l'image à partir du répertoire courant
et l'option `-t` permet de lui donner un nom.

On peut vérifier que l'image est bien construite en listant les images
disponible sur la machine :
```
% docker images
```
L'image doit apparaître avec la version `latest`, il est possible de
changer la version lors de la construction en changeant la valeur de l'option
`-t` avec par exemple `my-app:1.0`.

La commande `FROM` permet d'indiquer l'image de base sur laquelle notre 
nouvelle image va se baser. Que se passe t-il si l'on essaye de lancer
un conteneur avec cette nouvelle image ?
```
% docker run --rm my-app
```
L'image de base ne définit pas de commande par défaut, il faut explicitement
la donner au démarrage du conteneur :
```
% docker run -ti --rm my-app sh
```
Prenez le temps d'inspecter le contenu de l'image:
- où se trouve l'exécutable Java ?
- est-il dans le PATH ?

Ajouter la ligne suivante à la fin du fichier `Dockerfile`, reconstruisez
et lancez un conteneur :
```
CMD [ "java", "-version" ]
```
Le conteneur peut maintenant s'exécuter sans donner explicitement de commande
et affiche la version de java embarquée dans le conteneur.

Pour rendre l'image plus utile, on peut lui modifier son contenu, soit avec 
la commande `RUN` pour exécuter une commande arbitraire dont le résultat 
constituera une nouvelle version de l'image, soit avec la commande `COPY`
pour ajouter du contenu depuis le répertoire courant dans l'image.
On peut bien évidemment combiner ces deux commandes :
```
FROM java:8u111-jdk-alpine
RUN mkdir /app
COPY my-app.jar /app
CMD [ "java", "-jar", "/app/my-app.jar" ]
```
L'archive de l'application est disponible ici [my-app.jar](data/my-app.jar).
Le démarrage d'un conteneur à partir de cette image permet maintenant 
d'exécuter notre application. Le but de cette application est de fournir 
une API web sur le port 8080. Pour avertir l'utilisateur que le port 8080
a une importance particulière, la commande `EXPOSE` permet de lister
les ports exposés :

```
FROM java:8u111-jdk-alpine
RUN mkdir /app
COPY my-app-0.0.1-SNAPSHOT.jar /app
EXPOSE 8080
CMD [ "java", "-jar", "/app/my-app-0.0.1-SNAPSHOT.jar" ]
```

On peut maintenant lancer un conteneur et tester le service :
```
% docker run -d --name hello-service -p 8080:8080 my-app
% curl "http://localhost:8080/api/hello?name=Martin"
```
## Remarques

- On peut remarquer que si l'on lance la commande de construction
  plusieurs fois, seules les étapes de construction nécessaires sont 
  exécutées.
  Chaque commande du fichier Dockerfile produit une couche du système de 
  fichiers de l'image, si une commande et toutes les commandes précédentes
  n'ont pas changées la couche correspondante est réutilisée.

- Lors de la construction de l'image le contenu intégral du répertoire
  contenant le fichier `Dockerfile` sera transféré au daemon docker
  avant de démarrer la construction, un volume important de fichiers
  peut mettre un moment à être transféré.  

## Dépôt de l'image sur une registry

Actuellement notre nouvelle image n'est disponible que sur la machine
locale. Pour pouvoir l'installer et l'exécuter sur d'autre machine,
le plus simple est de la partager sur une `registry` externe (DockerHub,
Artifactory, etc.). Il faut pour cela créer un alias de notre image
dont le nom est préfixé par le DNS (et optionnellement le port)
du serveur de la registry, cela se fait avec la commande `tag` :
```
docker tag my-app artifactory.com:8383/my-app:1.0
```
On peut vérifier que la nouvelle image existe avec la commande `images` (en 
fait ce n'est pas une nouvelle image mais comme son nom l'indique un nouveau
tag sur la même image). L'image peut maintenant être téléversée sur le 
serveur :
```
% docker login artifactory.com:8383
% docker push artifactory.com:8383/my-app:1.0
```

Dans l'autre sens, une image peut être téléchargée soit directement avec la 
commande run (comme nous l'avons fait jusqu'à présent pour les images 
`busybox` et `nginx`) mais seulement si l'image n'est pas présente 
localement. Pour forcer un téléchargement il faut utiliser la commande
`pull` :
```
% docker pull artifactory.com:8383/my-app:1.0
```

## Quiz

* Quelle commande docker permet de construire une nouvelle image ?
* Quel est le nom du fichier décrivant la construction d'une image ?
* Quel mot clé permet de définir la commande par défaut de l'image ?