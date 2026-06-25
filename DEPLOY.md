# Qhub — Deployment guide

Production site: **https://chats-product.apexes.click/**

The deployment model is **manual git pull on the server**: code lives on GitHub, the server clones the repo once, then runs `./deploy.sh` whenever you push new changes.

## First-time server setup (run once)

SSH into the server, then:

```bash
# 1. Install Node 20 + git if missing
which node >/dev/null || (curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs)
which git  >/dev/null || sudo apt-get install -y git

# 2. Clone the repo (you need a PAT or SSH key with read access — repo is private)
sudo mkdir -p /var/www/apexes.click
cd /var/www/apexes.click
sudo chown $USER:$USER .
git clone https://github.com/apexit764-beep/qhub.git qhub-src
cd qhub-src

# 3. Build + deploy
chmod +x deploy.sh
./deploy.sh
```

After this, the live site at `https://chats-product.apexes.click/` should show the dashboard (replacing the placeholder).

## Future updates

Every time you `git push` from your local machine, ssh into the server and run:

```bash
cd /var/www/apexes.click/qhub-src
./deploy.sh
```

That single script does: `git pull → npm ci → npm run build:single → cp dist-single/index.html → web root`.

## Local development

```bash
npm install
npm run dev           # http://localhost:5173
npm run build:single  # builds dist-single/index.html (single-file bundle)
```
