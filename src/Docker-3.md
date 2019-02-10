
## Interaction entre conteneurs

La philosophie de Docker est : un service par conteneur. Pour réaliser une 
application entière, on se retrouve donc à faire interagir plusieurs conteneur
entre eux.

![Interaction entre conteneurs](nginx-sprinboot.png)

### L'option `--link`

Il faut tout d'abord lancer le conteneur à base de springboot créer 
précédemment:
```
% docker run -d --name backend my-app
```

Créer le fichier `nginx.conf` :
```
server {
    listen       80;
    server_name  localhost;
    location / {
        root   /usr/share/nginx/html;
        index  index.html;
    }
    location /api {
        proxy_pass   http://backend:8080/api;
    }
}
```

Et enfin lancer le serveur nginx avec la nouvelle configuration
et les resources web :
```
% docker run -d --name nginx \
    -v $PWD/nginx.conf:/etc/nginx/conf.d/default.conf \
    -v $PWD/web:/usr/share/nginx/html \
    -p 8080:80 \
    --link backend \
    nginx
```
L'option `--link $CONTAINER_NAME_OR_ID` permet d'initialiser une entrée DNS 
avec comme IP celle du conteneur lié (en modifiant le fichier `/etc/hosts`).
Si l'on souhaite que le l'entrée DNS est un nom différent de celui du 
conteneur lié, l'option devient `--link $CONTAINER_NAME_OR_ID:$DNS_NAME`.

Vérifier la modification du fichier `/etc/hosts` dans le conteneur.

### Docker Compose

Les lignes de commande de lancement des conteneurs commencent à devenir
de plus en plus complexes et il devient difficile d'automatiser le lancement
de l'application complète.

`docker-compose` permet de centraliser les informations des conteneurs de
l'application et d'automatiser leur démarrage. 

Créer un fichier `docker-compose.yml` contenant :
```
version: '3'
services:
  frontend:
    image: "nginx"
    volumes:
     - ./nginx.conf:/etc/nginx/conf.d/default.conf
     - ./web:/usr/share/nginx/html
    ports:
     - "8080:80"
  backend:
    image: "my-app"
```

Puis démarrer les conteneurs avec :
```
% docker-compose up -d
```

L'ensemble des conteneurs démarre automatiquement.

Comment le nom du backend est-il résolu ? docker-compose utilise [une 
configuration réseau avancée](https://docs.docker.com/v17.09/engine/userguide/networking/configure-dns/) qui lui permet de tirer profit d'un serveur DNS 
embarqué.
