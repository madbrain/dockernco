
# Docker (Part 1)

En plus de simplifier la configuration des conteneurs, Docker apporte
également un format d'image de système de fichiers distribuable.

L'image Docker définie le système de fichiers racine et le nom du programme
qui va être démarré dans le conteneur de façon isolé (réseau, pid, etc.). 

## Premiers Pas

Exécutons notre premier conteneur avec la commande `run` :
```
% docker run hello-world
```

Pour s'exécuter le conteneur a besoin de l'image `hello-world`, si elle n'est 
pas présente localement, elle est téléchargée depuis le [Docker Hub](https://hub.docker.com/_/hello-world). L'exécution du conteneur affiche tout 
simplement un message à l'écran.

On peut voir l'ensemble des conteneurs en cours d'exécution avec la commande :
```
% docker ps
```

Évidement aucun conteneur n'est en cours d'exécution, mais même une fois
terminé un conteneur n'est pas automatiquement effacé. La commande suivante
permet de lister l'ensemble des conteneurs peut importe leur état :
```
% docker ps -a
```
Le conteneur apparaît bien à l'état terminé. On peut y voir :
* son id
* son nom (généré automatiquement)
* la commande initialement lancée dans le conteneur

On peut nommer le conteneur au lancement avec l'option `--name` :
```
% docker run --name mon_hello hello-world
```

Vérifier que le nom du conteneur est bien pris en compte.
Essayer de relancer un conteneur avec le même nom. Est ce possible ?

Les conteneurs morts commencent à s'accumuler, pour supprimer
un ou plusieurs conteneurs, utiliser la commande suivante :
```
% docker rm $NOM_DU_CONTENEUR $ID_DU_CONTENEUR
```

Il est également possible de supprimer le conteneur automatiquement à la
fin de son exécution en utilisant l'option `--rm` au lancement :
```
% docker run --rm hello-world
```

Vérifier que le conteur est bien supprimé automatiquement.

## Interagir avec un conteneur

L'image `hello-world` est certainement incontournable pour faire
ses premiers pas mais on a rapidement fait le tour. L'image `busybox`
est une micro distribution contenant quelques utilitaires standards unix
dont un shell.

```
% docker run busybox
```

Est-ce que l'exécution produit quelque chose ? Quelle est la commande
lancée dans le conteneur ?

Habituellement lorsqu'on lance un shell il attend que l'on tape
des commandes. Mais par défaut Docker ferme l'entrée standard du processus
lancé. Pour autoriser le processus a recevoir des entrées il faut utiliser 
l'option `-i` :
```
% docker run -i --rm busybox
```

Il est maintenant possible de taper des commandes shell comme `echo $PATH`
et de terminer la session avec `exit` ou `CTRL-D`.

On remarquera que ce shell se comporte de façon étrange : il n'y a pas
de prompt et `CTRL-C` n'annule pas la commande en cours. Pour fonctionner
de façon nominale en mode interactif un shell à besoin d'une entrée standard
de type terminal (le terminal permet des fonctions supplémentaires comme
effacer l'écran, déplacer le curseur, etc.). 

L'entrée standard est passée en mode terminal avec l'option `-t` :
```
% docker run -it --rm busybox
```
Vérifier que le shell affiche maintenant un prompt.

Il est possible de modifier le programme de démarrage du conteneur
en l'ajoutant après le nom de l'image :
```
% echo "Bonjour le monde" | docker run -i --rm busybox base64
```

## Lancer un conteneur en mode *daemon*

Le lancement en mode interactif d'un conteneur n'est pas le seul mode de
fonctionnement. Le principal mode de fonctionnement est le fonctionnement
en mode *daemon*, c'est à dire que une fois lancé le conteneur rend 
immédiatement la main mais continu de s'exécuter en tâche de fond.
Un conteneur en mode *daemon* se lance avec l'option `-d` :
```
% docker run -d nginx
```

Vérifier que le conteneur est en cour d'exécution avec la commande `ps`.

Le conteneur peut être stoppé ou démarré avec les commandes `stop` et
`start` respectivement.

Un conteneur lancé en tâche de fond sert généralement à fournir un service 
par l'intermédiaire d'une connexion réseau (TCP, HTTP, etc.). Par défaut,
chaque conteneur est équipé d'une interface réseau spécifique (voir la 
première partie sur le namespace net), cette interface dispose d'une
adresse IP uniquement atteignable au sein de la machine hôte.

Il est possible de lister l'ensemble des caractéristiques d'un conteneur
grâce à la commande `inspect` et ainsi trouver son adresse IP :
```
% docker inspect $NOM_OU_ID
```

On peut se simplifier la vie en changeant le format de sortie avec
l'option `-f` et extraire uniquement le(s) champs intéressant(s) :
```
% docker inspect -f "L'IP est {{.NetworkSettings.IPAddress}}" $NOM_OU_ID
```
On peut maintenant accéder au service à l'URL suivante :
```
% curl http://${ADRESSE_IP_CONTENEUR}/
```

## Configurer le contexte d'exécution du conteneur

### Mapping d'un port réseau

Comme dit précédemment l'adresse IP du conteneur est uniquement
accessible depuis la machine hôte. Docker permet de lier
un port de la machine hôte avec un port du conteneur, le service
devient accessible depuis partout où la machine hôte est accessible
mais sur le port associé à la machine hôte. Cette opération d'association
se fait avec l'option `-p` :

```
% docker run -d -p 8080:80 nginx
```

Le service est maintenant accessible depuis le port 8080 de la machine
hôte (et donc probablement depuis un navigateur):
```
curl http://${ADRESSE_IP_HOTE}:8080/
```
### Montage de volumes externes

La page HTML servit est une page par défaut, on aimerait la modifier
pour servir un contenu avec plus de valeurs ajoutées.
La technique la plus simple
pour le faire est de rendre visible un répertoire de la machine hôte
dans le conteneur à un point de montage défini (on pourrait également
modifier l'image du conteneur, mais c'est pour plus tard...).
L'option `-v` permet de controller le montage de répertoire dans le conteneur.

Mais à quel endroit monter le répertoire dans le conteneur
pour qu'il soit servi par nginx ?

Il serait intéressant de pouvoir observer la configuration de nginx
à l'intérieur du conteneur et ainsi monter le contenu HTML au bon endroit.

Pour cela Docker nous donne la possibilité d'exécuter une commande à
l'intérieur d'un conteneur existant, cette commande pouvant elle-même
être interactive comme un shell. Le lancement d'une commande à intérieur
d'un conteneur existant se fait avec la commande `exec` :

```
% docker exec -ti ${ID_OU_NOM} bash
```

On peut maintenant se balader dans le système de fichiers du conteneur
et inspecter les fichiers de configuration tels que 
`/etc/nginx/conf.d/default.conf`.

Trouver le répertoire contenant le site Web. Il est maintenant possible
de lancer le conteneur avec ce répertoire remplacé par un répertoire
local à la machine hôte (utiliser le contenu de cette [archive](data/web.tar.gz)):
```
% docker run -d -p 8080:80 -v $PWD/web:${WEB_NGINX} nginx
```

Vérifier que le contenu servi est bien le nouveau site Web.

Bien que le conteneur soit lancé en mode daemon, il est possible
de voir l'activité dans le conteneur sans rentrer dedans en visualisant les 
logs générés sur la sortie standard par nginx :
```
% docker logs ${ID_OU_NOM}
```

Regarder à chaque requête Web l'évolution du log.

### Modification de variables d'environnement

Il est également possible de définir des variables d'environnement
au lancement du conteneur. Cela sert généralement à configurer le
conteneur sans forcement utiliser un montage ou construire une
nouvelle image :
```
% docker run --rm -e MSG=hello busybox env
```

## Quiz

* Quelle commande permet d'exécuter un conteneur ?
* Quelle option permet de supprimer un conteneur en fin d'exécution ? 
* Quelle commande permet d'exécuter une commande dans un conteneur ?
* Quelle option permet d'exécuter une commande interactive ?
* Quelle commande permet de lister tous les conteneurs ?