
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
du cycle de vie des conteneur qui lui sont attribué.

```
wget https://storage.googleapis.com/kubernetes-release/release/v1.7.6/bin/linux/amd64/kubelet
chmod +x kubelet
```

```
sudo ./kubelet --pod-manifest-path=$PWD/manifests/ --root-dir=$PWD/root
```

## Apiserver

```
mkdir etcd-data
docker run -d \
    -v $PWD/etcd-data:/default.etcd \
    --net=host \
    --name=etcd-container \
    quay.io/coreos/etcd
```

```
export ETCDCTL_API=3
etcdctl get --prefix "" --keys-only
```

password.txt
```
secret,joe,1000,"users"
secret,john,1001,"users,admin"
```

```
./kube-apiserver \
  --etcd-servers=http://127.0.0.1:2379 \
  --service-cluster-ip-range=10.0.0.0/16 \
  --cert-dir=$PWD/certs \
  --authorization-mode=RBAC \
  --basic-auth-file=$PWD/password.txt

```

## Kubectl

## Scheduler

# Sources

* [Kubernetes High Level Overview](https://jvns.ca/blog/2017/06/04/learning-about-kubernetes/)

* [Kubernetes Components Part 1](http://kamalmarhubi.com/blog/2015/08/27/what-even-is-a-kubelet/)

* [Kubernetes Components Part 2](http://kamalmarhubi.com/blog/2015/09/06/kubernetes-from-the-ground-up-the-api-server/)

* [Kubernetes Components Part 3](http://kamalmarhubi.com/blog/2015/11/17/kubernetes-from-the-ground-up-the-scheduler/)
