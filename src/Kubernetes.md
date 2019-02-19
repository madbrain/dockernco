
# Kubernetes

Comme vu précédemment `docker-compose` permet d'orchestrer des services,
mais seulement sur une seule machine hôte. La solution *de facto* pour
gérer des conteneurs sur plusieurs machines hôtes (cluster) est `Kubernetes`.

Kubernetes est formé de multiples composants interagissant ensemble :
- `kubelet`
- `apiserver`
- `scheduler`
- etc.

## Kubelet

kubelet est un agent installé sur chaque machine hôte. Il est responsable
du cycle de vie des conteneurs qui lui sont attribués.

### Installation et lancement en mode `Standalone`

Télécharger le binaire de `kubelet` :
```
wget https://storage.googleapis.com/kubernetes-release/release/v1.7.6/bin/linux/amd64/kubelet
chmod +x kubelet
```
Lancer `kubelet` :
```
mkdir manifests
sudo ./kubelet --pod-manifest-path $PWD/manifests
```
En fonctionnement normal `kubelet` a besoin de du composant `apiserver` pour obtenir 
les informations sur les conteneurs à déployer. Il est possible de le lancer en mode 
standalone, les descripteurs sont alors de simples fichiers locaux à la machine.

L'option `--pod-manifest-path` permet d'indiquer le répertoire qui contient les
descripteurs des conteneurs à lancer sur cette machine hôte.
Le service semble devoir fonctionner avec les droits root, d'où l'invocation avec 
`sudo`.

### Création de conteneurs

En fait avec Kubernetes, l'unité de déploiement n'est pas le conteneur mais le [`Pod`](https://kubernetes.io/docs/concepts/workloads/pods/pod-overview/).
Un Pod est un ensemble de conteneurs partageant les resources réseau et volume,
mais, sauf cas exceptionnel, on ne mettra qu'un seul conteneur par Pod.

Pour déployer un Pod, il faut le décrire dans un fichier YAML, puis placer le fichier
dans le répertoire `$PWD/manifests`.

Écrire le fichier `nginx.yml` et le déplacer dans le répertoire `manifests` :
```
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: nginx
    image: nginx
    ports:
    - containerPort: 80
    volumeMounts:
    - mountPath: /var/log/nginx
      name: nginx-logs
  - name: log-truncator
    image: busybox
    command:
    - /bin/sh
    args: [-c, 'while true; do cat /dev/null > /logdir/access.log; sleep 10; done']
    volumeMounts:
    - mountPath: /logdir
      name: nginx-logs
  volumes:
  - name: nginx-logs
    emptyDir: {}
```

Constater que les conteneurs ont été créés :
```
docker ps
```

Nous pouvons remarquer que les deux conteneurs au sein du Pod partage le même
volume. L'option `emptyDir` indique que le volume sera alloué dynamiquement sur
la machine hôte.

Chaque machine hôte d'un cluster Kubernetes fait tourner un processus `kubelet`
pour gérer ses propres conteneurs. C'est le service `apiserver` qui permet de 
centraliser l'ensemble des informations du cluster, chaque `kubelet` interroge 
l'`apiserver` pour obtenir le travail qui lui est propre.

## Apiserver

L'`apiserver` utilise la base de données distribuées [Etcd](https://coreos.com/etcd/) 
pour stocker les données du cluster.

Lancer une instance de la base de données :
```
mkdir etcd-data
docker run -d \
    -v $PWD/etcd-data:/default.etcd \
    --net=host \
    --name=etcd-container \
    quay.io/coreos/etcd
```

A tout moment il sera possible de venir voir le contenu de la base de données
avec les commandes suivantes :
```
docker exec -ti etcd-container bash
export ETCDCTL_API=3
etcdctl get --prefix "" --keys-only
```

### Démarrage de l'API server

Télécharger le binaire de `apiserver` :
```
wget https://storage.googleapis.com/kubernetes-release/release/v1.7.6/bin/linux/amd64/apiserver
chmod +x apiserver
```

Puis lancer une instance du serveur avec la commande suivante :
```
sudo ./kube-apiserver \
  --etcd-servers=http://127.0.0.1:2379 \
  --service-cluster-ip-range=10.0.0.0/16
```

L'option `--service-cluster-ip-range` sert à configurer le CIDR utilisé
par les IP de services, nous ne les utiliserons pas mais l'option est obligatoire.

On peut vérifier que le serveur est fonctionnel en interrogeant l'API :
```
curl http://localhost:8080/api/v1/nodes
```

Cette API permet de lister les informations relatives aux nœuds du cluster,
comme on peut s'en douter il n'y en a pas.

Relacer une instance de `kubelet` avec l'option suivante :
```
sudo ./kubelet --api-servers=127.0.0.1:8080
```

Et vérifier que le nœud est maintenant connu de l'`apiserver`
en relançant l'appel à l'API nodes.

### Lancement d'un Pod au travers de l'API server

Remplacer dans le fichier JSON `nginx.json` suivant, `$$ma_machine$$` par le nom
de la machine hôte obtenu avec l'appel à l'API hosts :
```
{
  "apiVersion": "v1",
  "kind": "Pod",
  "metadata": {
    "name": "nginx"
  },
  "spec": {
    "nodeName": "$$ma_machine$$",
    "containers": [
      {
        "name": "nginx",
        "image": "nginx",
        "ports": [
          {
            "containerPort": 80
          }
        ],
        "volumeMounts": [
          {
            "mountPath": "/var/log/nginx",
            "name": "nginx-logs"
          }
        ]
      },
      {
        "name": "log-truncator",
        "image": "busybox",
        "command": [
          "/bin/sh"
        ],
        "args": [
          "-c",
          "while true; do cat /dev/null > /logdir/access.log; sleep 10; done"
        ],
        "volumeMounts": [
          {
            "mountPath": "/logdir",
            "name": "nginx-logs"
          }
        ]
      }
    ],
    "volumes": [
      {
        "name": "nginx-logs",
        "emptyDir": {
        }
      }
    ]
  }
}
```

On peut remarquer que le contenu du fichier est strictement le même
que le Pod précédent, les seules différences sont qu'il est au format JSON pour
pouvoir être consommé directement par l'apiserver avec un appel CURL
et que le champ `nodeName` indique sur quelle machine hôte le Pod doit être lancé.
Ce champ supplémentaire est obligatoire pour que le service `kubelet` trouve
les conteneurs qui lui sont affectés.

Le démarrage du Pod est effectué en enregistrant ses informations dans l'apiserver :
```
curl \
  -X POST http://localhost:8080/api/v1/namespaces/default/pods \
  -H 'Content-Type: application/json' \
  -d @nginx.json
```

Le statut du Pod peut être vérifié avec l'appel à API suivant :
```
curl http://localhost:8080/api/v1/namespaces/default/pods/nginx
```

Comme on s'en doute déjà, le pod peut être supprimé avec l'appel suivant :
```
curl -X DELETE http://localhost:8080/api/v1/namespaces/default/pods/nginx
```

## Kubectl

La commande `kubectl` permet de simplifier l'utilisation de l'API REST,
en fournissant à l'utilisateur les fonctionnalité de l'api sous forme de mot clés :
 - `get`
 - `create`
 - `delete`
 - etc.

Télécharger le binaire de `kubectl` :
```
wget https://storage.googleapis.com/kubernetes-release/release/v1.7.6/bin/linux/amd64/kubectl
chmod +x kubectl
```

et tester la commande :
```
./kubectl get nodes
```

on peut maintenant créer un pod directement au format YAML avec le même fichier
utiliser dans le mode standalone :
```
./kubectl create -f nginx.yml
```
Il faut bien évidemment ajouter le champ `nodeName` pour que le Pod soit effectivement
démarrer sur une machine hôte.

## Scheduler

L'affectation manuelle des Pods au nœuds, même si elle est possible, est rare.
C'est le travail du programme `kube-scheduler` qui comme sont noms l'indique
permet d'affecter un nouveau pod à un nœud, en respectant en plus des contraintes
(répartition de charge, propriétés du nœud, etc.) 

Télécharger le binaire de `kube-scheduler` :
```
wget https://storage.googleapis.com/kubernetes-release/release/v1.7.6/bin/linux/amd64/kube-scheduler
chmod +x kube-scheduler
```

Démarrage de `kube-scheduler` :
```
./kube-scheduler --master=http://localhost:8080
```

Recréer le pod mais cette fois sans le champs `nodeName` :
```
./kubectl create -f nginx.yml
```
Dans l'ordre les opérations sont :
 - `kubectl` enregistre le pod dans l'API server
 - `kube-scheduler` trouve un pod non affecté et lui attribut le (seul) nœud
 - `kubelet` trouve un pod qui lui est attribué mais non démarré localement,
  il démarre alors une instance du pod.

# Conclusion

L'ensemble des fonctionnalité de Kubernetes fonctionne sur le même principe :
 - des objets sont enregistrés dans l'API (Pod, Service, ServiceAccount, etc.
 il en existe des dizaines)
 - des contrôleurs inspectent l'état de ces objets et :
   - soit modifient ou complètent leurs propriétés comme dans le cas du scheduler
   - soit synchronisent l'état désiré de l'objet avec une resource système
   (conteneurs, DNS, routage réseau, etc.).

Les différents services sont conçus pour offrir une robustesse de fonctionnement :
par exemple si un nœud tombe en panne, l'ensemble des conteneurs qui lui sont
affectés est redistribué sur les autres nœuds.

# Sources

* [Kubernetes High Level Overview](https://jvns.ca/blog/2017/06/04/learning-about-kubernetes/)

* [Kubernetes Components Part 1](http://kamalmarhubi.com/blog/2015/08/27/what-even-is-a-kubelet/)

* [Kubernetes Components Part 2](http://kamalmarhubi.com/blog/2015/09/06/kubernetes-from-the-ground-up-the-api-server/)

* [Kubernetes Components Part 3](http://kamalmarhubi.com/blog/2015/11/17/kubernetes-from-the-ground-up-the-scheduler/)
