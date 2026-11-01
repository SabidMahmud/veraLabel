# VeraLabel

VeraLabel is a self-hosted image classification workspace for research teams. An administrator creates projects and annotator accounts; annotators inspect images, select project-specific labels, and save notes. Images and annotations remain on infrastructure you control.

This repository includes **Docker Compose** for one server and **Kubernetes manifests** for an existing cluster. Both use the same application image, MongoDB, and Nginx image server.

> Research tooling. The annotation threshold counts independent submissions; it does not check agreement or resolve conflicts. Reviewer adjudication, segmentation tools, and dataset export are not implemented.

## Choose your deployment

- **One computer, VPS, or lab server:** follow [Docker Compose](#docker-compose).
- **An existing Kubernetes/K3s cluster:** follow [Kubernetes](#kubernetes).
- **Already deployed:** follow [first-time onboarding](#first-time-onboarding).

Run commands from the repository root unless a step says otherwise. Replace example domains, email addresses, paths, image names, and project IDs with your own values.

## What happens on first startup?

1. MongoDB starts with persistent disk storage. On an **empty database volume**, its initialization script creates a database user with read/write access to the `veralabel` database. You do not create collections manually; the application creates them when used.
2. A seed process creates the administrator using `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Compose waits for it to finish; Kubernetes runs it as an init container before starting the application. On subsequent starts it leaves an existing active administrator and password unchanged.
3. The application starts. Its readiness endpoint checks database connectivity.
4. Nginx serves the application and the mounted image directory. Image requests require an active authenticated account.
5. The administrator signs in, creates a project, registers its image files, and creates annotator accounts.

A new installation has **no projects and no images**. Mounting a directory makes files accessible to Nginx; running the importer registers those files in MongoDB so the queue can find them. Both steps are required.

## Docker Compose

### 1. Requirements and source code

Install Docker Engine with the Docker Compose plugin. Verify:

```sh
docker --version
docker compose version
```

Allow roughly 2 GB RAM for the running stack, additional memory for image building, and disk space for your datasets and database. The supplied MongoDB 8 image needs a compatible CPU; older x86 systems without AVX cannot run it.

```sh
git clone https://github.com/SabidMahmud/veraLabel.git
cd veraLabel
cp .env.example .env
mkdir -p data/images
```

### 2. Configure the deployment

Open `.env` in a text editor. Fill these required values:

| Variable | What to enter |
| --- | --- |
| `NEXTAUTH_URL` | The exact browser URL, initially `http://localhost:8080`. No trailing slash. |
| `NEXTAUTH_SECRET` | A randomly generated session secret. |
| `MONGO_ROOT_PASSWORD` | A separate random password for database administration/backups. |
| `MONGO_APP_PASSWORD` | A separate random password for the application's restricted database user. |
| `ADMIN_EMAIL` | The email you will use to sign in as administrator. |
| `ADMIN_PASSWORD` | A strong initial administrator password, at least 12 characters. |
| `DATA_FOLDER_PATH` | The host directory containing images, initially `./data/images`. |

Generate **each** of the three random values separately:

```sh
openssl rand -hex 32
```

Paste each result into its corresponding variable. Use hex for `MONGO_APP_PASSWORD`: it is inserted into a database URI without additional URL encoding. Never commit `.env` or share it publicly.

To use existing images, set an absolute path, for example:

```dotenv
DATA_FOLDER_PATH=/mnt/research/images
```

Create that directory first. Files must be readable and directories traversable by the proxy container. The mount is read-only: VeraLabel does not move or modify your images. On an SELinux host, apply an appropriate shared container label to a dedicated dataset directory or add `:z` to its bind mounts; do not relabel a system directory.

For a different HTTP port, change **both** `HTTP_PORT` and the port in `NEXTAUTH_URL`. Keep `BIND_ADDRESS=127.0.0.1` for local access or a host reverse proxy. For deliberate LAN access, set `BIND_ADDRESS=0.0.0.0` and use the server's address in `NEXTAUTH_URL`. Use HTTPS when credentials or images cross an untrusted network.

### 3. Start and verify

```sh
docker compose up -d --build
docker compose ps -a
docker compose logs seed
curl -f http://localhost:8080/api/health
```

The first build downloads dependencies and can take several minutes. Expected state: `db`, `web`, and `proxy` healthy; `seed` exited with code `0`; health response `{"status":"ready"}`. If you changed the port, adjust the curl command.

Open **http://localhost:8080/admin/login**, sign in using the administrator credentials in `.env`, and continue with [first-time onboarding](#first-time-onboarding).

Only the proxy port is published. MongoDB and the application port stay on Docker's internal network. Database files live in the `mongo_data` named volume; source images stay in `DATA_FOLDER_PATH`.

### 4. Optional: public HTTPS with Caddy

Use a domain whose DNS A/AAAA records point to your server. Permit inbound TCP ports 80 and 443; ensure no other service occupies them. In `.env`, set:

```dotenv
DOMAIN=annotate.example.com
NEXTAUTH_URL=https://annotate.example.com
BIND_ADDRESS=127.0.0.1
```

Start with both Compose files:

```sh
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.https.yml logs caddy
```

Caddy obtains and renews a public certificate. Open `https://annotate.example.com/admin/login`. Use the same two `-f` arguments for later stack lifecycle commands. Certificate state is kept in named volumes. This example requires a publicly resolvable domain and reachable ports; it does not configure certificates for private IP addresses.

If you already have a reverse proxy, omit Caddy and forward your public hostname to `127.0.0.1:8080`, preserving the original Host and `X-Forwarded-Proto: https` headers. Always set `NEXTAUTH_URL` to the public HTTPS address.

## Kubernetes

These manifests are a **single-instance deployment**, suitable for a research server or homelab. They do not install Kubernetes, a storage provisioner, an Ingress controller, or a highly available MongoDB cluster.

### 1. Check your cluster

You need:

- `kubectl` connected to the intended cluster and permission to create a namespace.
- A default StorageClass that can provision `ReadWriteOnce` volumes, or existing compatible persistent volumes.
- Registry access from every node, or an application image imported onto every eligible node.
- An Ingress controller and a TLS certificate if you want access through a domain.

```sh
kubectl config current-context
kubectl get nodes
kubectl get storageclass
kubectl get ingressclass
```

The defaults request **10 GiB for MongoDB** and **20 GiB for images**. Edit `deploy/kubernetes/base/mongodb.yaml` and `storage.yaml` before deploying if you need different sizes or `storageClassName` values. These are real persistent volume claims, not directories on your workstation.

### 2. Build and publish your application image

Use a registry/repository you can push to. Example:

```sh
export VERALABEL_IMAGE=ghcr.io/YOUR_ACCOUNT/veralabel:v1
docker login ghcr.io
docker build -t "$VERALABEL_IMAGE" .
docker push "$VERALABEL_IMAGE"
```

The build architecture must match your nodes. For mixed AMD64/ARM64 clusters, use a configured Buildx builder:

```sh
docker buildx build --platform linux/amd64,linux/arm64 -t "$VERALABEL_IMAGE" --push .
```

Edit the `images` section in **`deploy/kustomization.yaml`** to use the same repository and tag:

```yaml
images:
  - name: veralabel
    newName: ghcr.io/YOUR_ACCOUNT/veralabel
    newTag: v1
```

Use a new, immutable tag for each release. No official prebuilt VeraLabel image is provided by this repository.

For a private registry, create an image pull secret in the `veralabel` namespace and uncomment `imagePullSecrets` in `application.yaml` and the temporary dataset-tools Pod. This secret is separate from the application secrets created next. See the [Kubernetes private registry guide](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/).

### 3. Create deployment secrets

```sh
kubectl apply -f deploy/kubernetes/base/namespace.yaml
cp deploy/kubernetes/secrets.env.example deploy/kubernetes/secrets.env
```

Edit `secrets.env`. Fill `NEXTAUTH_SECRET`, `MONGO_ROOT_PASSWORD`, and `MONGO_APP_PASSWORD` with separately generated values (`openssl rand -hex 32`). Set `ADMIN_EMAIL` and an `ADMIN_PASSWORD` of at least 12 characters.

In `MONGODB_URI`, replace `REPLACE_WITH_MONGO_APP_PASSWORD` with the **same** hex value you assigned to `MONGO_APP_PASSWORD`:

```dotenv
MONGODB_URI=mongodb://veralabel:YOUR_ACTUAL_HEX_PASSWORD@db:27017/veralabel?authSource=veralabel
```

This is a plain env file, not a shell script: it does **not** expand references to other variables. Keep passwords unquoted, do not use example values, and do not commit this file.

Create the Secret:

```sh
kubectl -n veralabel create secret generic veralabel-secrets \
  --from-env-file=deploy/kubernetes/secrets.env \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 4. Configure the URL and apply

For an initial local check, leave both URLs in `deploy/kubernetes/base/configmap.yaml` set to `http://localhost:8080`. For a domain deployment, set **both** `NEXTAUTH_URL` and `AUTH_URL` to your exact public address, such as `https://annotate.example.com`.

Preview and apply:

```sh
kubectl kustomize deploy
kubectl apply -k deploy
kubectl -n veralabel rollout status statefulset/veralabel-mongodb --timeout=300s
kubectl -n veralabel rollout status deployment/veralabel --timeout=300s
kubectl -n veralabel get pods,pvc,services
kubectl -n veralabel logs deployment/veralabel -c seed-admin
```

MongoDB initializes its users only on an empty data volume. The application init container may retry while MongoDB starts; it must eventually finish successfully. ConfigMaps, Services, and PVCs are namespaced under `veralabel`. There is no LoadBalancer or NodePort by default.

For the local HTTP check, keep this command running:

```sh
kubectl -n veralabel port-forward service/veralabel 8080:8080
```

In another terminal:

```sh
curl -f http://localhost:8080/api/health
```

Open `http://localhost:8080/admin/login` and sign in. Port-forward the **veralabel proxy service**, not the `web` service, so image requests work too. If you configured an HTTPS public URL, use that domain instead; changing only the browser URL causes cookie and redirect problems.

### 5. Optional: expose through Ingress

Copy and edit the example:

```sh
mkdir -p deploy/kubernetes/local
cp deploy/kubernetes/ingress.example.yaml deploy/kubernetes/local/ingress.yaml
```

In your copy, set:

- `ingressClassName` to the class shown by `kubectl get ingressclass` (often `traefik` on K3s).
- Both hostnames to your domain.
- `tls.secretName` to a TLS Secret in the `veralabel` namespace.

Point DNS at your Ingress controller. Supply a certificate with your existing cert-manager configuration, or create the TLS Secret yourself:

```sh
kubectl -n veralabel create secret tls veralabel-tls \
  --cert=/path/to/fullchain.pem --key=/path/to/privkey.pem
```

Set both application URLs to the HTTPS domain in `configmap.yaml`, then apply and restart:

```sh
kubectl apply -k deploy
kubectl -n veralabel rollout restart deployment/veralabel
kubectl apply -f deploy/kubernetes/local/ingress.yaml
kubectl -n veralabel get ingress
```

Ingress must route **all paths** to Service `veralabel` port `8080`; it must preserve Host and forward the public HTTPS scheme. Image delivery and image authorization pass through this proxy. The Ingress manifest does not install a controller or automatically create a certificate without cert-manager and an appropriate issuer.

### 6. Choose where Kubernetes image files live

The default `veralabel-images` PVC is mounted read-only in Nginx. Use the temporary tools Pod described in onboarding to copy files into it.

If your images already live on a NAS/NFS/CSI volume, create or bind a compatible PVC named `veralabel-images` in the namespace instead. Remove `kubernetes/base/storage.yaml` from `deploy/kustomization.yaml` when managing that PVC separately. Keep the proxy mount at `/usr/share/nginx/images` and the importer mount at `/data/images`. Do not create a second empty volume and expect existing NAS files to appear in it.

With `ReadWriteOnce`, keep one application replica. The tools Pod has node affinity to the application so both use the same node. `Recreate` deployment updates briefly stop the application to avoid volume attachment conflicts. Multiple replicas need shared storage and additional application/database design; increasing the replica count alone is not a supported scaling configuration. See [Kubernetes storage access modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes).

## First-time onboarding

The admin dashboard links to an in-app setup guide at `/admin/setup`.

### 1. Sign in and create a project

Open `/admin/login` and use the credentials supplied at deployment. Select **Create Project**. Enter a project name, instructions, at least two labels, and the required number of annotations per image.

Open `/projects` and copy the project's ID. Each project card displays it. You will use this ID for import. Annotators can also select their project here; no one needs to construct a viewer URL manually.

### 2. Put your images into storage

Organize one dataset per subdirectory. Example:

```text
images/
  dataset-a/
    slide1.jpg
    slide2.tif
  dataset-b/
    sample.png
```

The mappings are automatic:

| Deployment | File location | Stored image URL |
| --- | --- | --- |
| Compose | `${DATA_FOLDER_PATH}/dataset-a/slide1.jpg` on the host | `/images/dataset-a/slide1.jpg` |
| Kubernetes | `dataset-a/slide1.jpg` within the `veralabel-images` PVC | `/images/dataset-a/slide1.jpg` |

You **do not paste image links, configure a link per image, or store image bytes in MongoDB**. MongoDB stores file references and annotations. The importer generates relative URLs and encodes spaces and other filename characters. Nginx reads the corresponding files from storage.

Supported import extensions: JPG/JPEG, PNG, WebP, TIFF/TIF, BMP, and GIF. The viewer displays the first TIFF frame; not every TIFF encoding is supported. Hidden files and symlinks are skipped. Keep registered files in place: renaming or moving them breaks their stored links.

**Compose:** copy files into the configured host directory. With the default path:

```sh
mkdir -p data/images/dataset-a
cp /path/to/your/images/* data/images/dataset-a/
```

The example copies files from one directory; use your file manager or a recursive copy if your dataset has nested folders. Do not run the example until you have replaced the source path.

**Kubernetes:** create a temporary Pod that can write to the image PVC. Use the same `VERALABEL_IMAGE` value you built and pushed earlier. For a private registry, add its image pull secret to the Pod example before applying it.

```sh
sed "s|veralabel:local|$VERALABEL_IMAGE|" deploy/kubernetes/dataset-tools.example.yaml | kubectl apply -f -
kubectl -n veralabel wait --for=condition=Ready pod/veralabel-dataset-tools --timeout=180s
kubectl -n veralabel exec veralabel-dataset-tools -- mkdir -p /data/images/dataset-a
kubectl -n veralabel cp /path/to/your/images/. veralabel-dataset-tools:/data/images/dataset-a/
kubectl -n veralabel exec veralabel-dataset-tools -- chmod -R a+rX /data/images/dataset-a
```

This copies your local files into persistent cluster storage. For very large datasets, populate your NAS/volume directly rather than transferring through `kubectl cp`. The tools Pod can read deployment secrets; only administrators should create or access it.

### 3. Register files with a project

Replace `YOUR_PROJECT_ID` with the ID from `/projects`. `dataset-a` is the subdirectory **inside the image root**, not the absolute host path.

**Compose:**

```sh
docker compose run --rm import YOUR_PROJECT_ID dataset-a
```

**Kubernetes**, using the tools Pod above:

```sh
kubectl -n veralabel exec veralabel-dataset-tools -- \
  node scripts/import-images.js YOUR_PROJECT_ID dataset-a
```

Expected output resembles: `Found 200 images; imported 200; already registered 0.` Re-running the same command registers newly added files and preserves existing image status and annotations. It does not delete registrations for removed files.

After a Kubernetes import, remove the temporary Pod; its PVC and images remain:

```sh
kubectl -n veralabel delete pod veralabel-dataset-tools
```

### 4. Create annotator accounts

On the administrator dashboard, select **Add Doctor** (the current UI label). Enter a name, email, and initial password of at least 8 characters. These accounts receive the `annotator` role. Medical specialization/license inputs are legacy UI fields and are not stored.

Public registration is disabled. Creating an account does not send an invitation email. Share the site URL and individual credentials through a private channel. All active accounts can see all projects; this version does not implement project membership isolation.

### 5. Verify before collecting annotations

Sign in with a test annotator account, open a project, and confirm an image appears. Select a label and choose **Save & Next Image**. Check the annotation count in the administrator dashboard. A user should not be served the same image again after submitting it.

Use test images and a separate test project for this check. With a threshold of 2, two distinct users must submit before the image is marked completed. Conflicting labels still count toward completion; this is not a validated consensus decision.

## Email and passwords

SMTP is optional for deployment. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` to enable email-based password resets. For port 587 with STARTTLS, use `SMTP_SECURE=false`; for implicit TLS on port 465, use `true`.

Compose passes these from `.env`. On Kubernetes, SMTP settings live in the ConfigMap and credentials in `veralabel-secrets`; restart the application after changing them. Without SMTP, an administrator can reset an annotator's password through the dashboard's edit-account dialog. Changing `ADMIN_PASSWORD` in deployment configuration does **not** reset an existing administrator password; use password recovery or another administrator account.

## Operations, backups, and updates

### Compose operations

```sh
docker compose logs --tail=100 web proxy db
docker compose restart web
docker compose down
```

`down` stops containers while keeping named volumes. **Do not add `-v` unless you intend to delete the database volume.** Keep `.env` and the image directory when moving the installation.

Back up the database to a protected directory:

```sh
mkdir -p backups
chmod 700 backups
docker compose exec -T db sh -c 'exec mongodump --username root --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db veralabel --archive --gzip' > backups/mongodb.archive.gz
```

Back up `DATA_FOLDER_PATH` separately with your normal file backup tool. A database dump alone does not include images. Keep previous dated backups rather than overwriting your only good copy.

To restore a backup **into a recovery installation**, stop application writes and run the following. `--drop` replaces the collections included in the dump:

```sh
docker compose stop proxy web
docker compose exec -T db sh -c 'exec mongorestore --username root --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip --drop' < backups/mongodb.archive.gz
docker compose up -d
```

Restore the matching image files too. Test recovery before relying on backups.

After reviewing and pulling a new application release, back up data, then rebuild:

```sh
docker compose up -d --build
```

### Kubernetes operations

```sh
kubectl -n veralabel logs deployment/veralabel -c web --tail=100
kubectl -n veralabel logs deployment/veralabel -c proxy --tail=100
kubectl -n veralabel describe pod -l app=veralabel
```

Back up MongoDB with its administrative credentials already present in the database Pod:

```sh
mkdir -p backups
chmod 700 backups
kubectl -n veralabel exec veralabel-mongodb-0 -- sh -c 'exec mongodump --username root --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db veralabel --archive --gzip' > backups/mongodb.archive.gz
```

Back up the image PVC separately using your CSI/NAS backup tooling, and preserve deployment secrets securely. PVC deletion or namespace deletion can destroy stored data depending on your provisioner's reclaim policy. StatefulSet storage is not a database backup.

To restore **in a recovery namespace/cluster** initialized with the manifests and secrets, stop application writes first. This replaces collections from the archive:

```sh
kubectl -n veralabel scale deployment/veralabel --replicas=0
kubectl -n veralabel exec -i veralabel-mongodb-0 -- sh -c 'exec mongorestore --username root --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip --drop' < backups/mongodb.archive.gz
kubectl -n veralabel scale deployment/veralabel --replicas=1
```

For an application update, build/push a new image tag, change `newTag` in `deploy/kustomization.yaml`, and apply:

```sh
kubectl apply -k deploy
kubectl -n veralabel rollout status deployment/veralabel --timeout=300s
```

After ConfigMap or Secret environment changes, run `kubectl -n veralabel rollout restart deployment/veralabel`. Database credentials are initialized once: changing a Secret or `.env` value alone does not change passwords stored in MongoDB. Rotate credentials in the database and configuration together.

### Existing MongoDB 6 deployments

The old Compose file used MongoDB 6 and a `veralabel_data` volume. This setup uses MongoDB 8 and a separate `mongo_data` volume. An existing database is **not automatically migrated**. Preserve the old volume and back it up. Do not attach its raw files to MongoDB 8; follow MongoDB's supported upgrade sequence before moving existing research data. See the [MongoDB upgrade documentation](https://www.mongodb.com/docs/manual/release-notes/8.0-upgrade-standalone/).

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Compose reports a missing variable | Fill all required values in `.env`; run commands from the repository root. |
| `seed` fails / Kubernetes init container restarts | Read seed logs; check database readiness, URI/password agreement, and administrator password length. Existing inactive/non-admin accounts cannot be reused as the seed administrator. |
| Database authentication fails after editing secrets | MongoDB users are created only on the first initialization. Restore the original configuration or rotate the stored database credentials properly. |
| Login repeats or cookies do not persist | Make the configured URL match the browser scheme, hostname, and port. Preserve forwarded HTTPS headers and restart the app after changes. |
| No projects after login | Sign in at `/admin/login`, create a project, then open `/projects`. |
| Project says no images are available | Copy files into mounted storage **and run import** with the correct project ID/subdirectory. It may also mean this user has already annotated every eligible image. |
| Image request returns 401 | Sign in with an active account. Image URLs are intentionally protected. |
| Image request returns 403/404 | Check the file exists under the mounted root, filename case, file permissions, and whether it was moved after import. |
| `kubectl cp` or importer cannot write/read files | Check the tools Pod is on the application node, the correct PVC is mounted, and dataset file permissions permit reading. |
| PVC stays Pending | Describe the PVC; check StorageClass, available capacity, and access mode. A WaitForFirstConsumer class may wait for a Pod to be scheduled. |
| `ImagePullBackOff` | Check registry path/tag, node architecture, and image pull secret. |
| Ingress returns 502/503 | Check Pod readiness, seed logs, database health, and that the backend is `veralabel:8080`. |
| Password reset email fails | Configure SMTP, or ask an administrator to reset the account password. |

## Local development

Use Node.js 22 and an accessible MongoDB instance. Compose's `db` hostname works only inside its network; a process on your workstation needs a reachable database URI. Put your development URI, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL=http://localhost:3000` into `.env.local`.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm run build
```

Local image viewing still needs an image server/proxy; the Compose and Kubernetes deployments supply it. `STORAGE_PROVIDER`, S3 variables, and the old Google Drive fallback are not deployment features in this version.

The container uses Next.js [standalone output](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output), runs the application as a non-root user, and excludes local secrets/datasets from its build context. Compose startup uses [health and completion dependencies](https://docs.docker.com/compose/how-tos/startup-order/); Kubernetes uses readiness/liveness probes and an init container.
