# Debian Setup Plan — DevStream + Pixel Canvas Bot

Run this on the fresh Debian machine. An AI agent (opencode) can execute most of it;
every step that requires a human is marked **[USER]**.

Target state: `docker compose up -d` runs two containers (`devstream` on port 3000 and
`pixel-canvas-bot`), with DevStream able to start/stop the bot via the mounted Docker socket.

**Nothing beyond Docker, git and curl needs to be installed on the host** — both apps run in
containers (devstream builds `node:20-alpine`, bot builds `python:3.12-slim` + chromium).

---

## Phase 0 — User prerequisites **[USER]**

1. Install Debian (12 bookworm or 13 trixie). During install, add your user to the **sudo**
   group (installer option) — the agent's `sudo` steps need it.
2. Install opencode on the machine.
3. Provide OneDrive access — needed for the secrets (`.env`, `OAUTH.txt`) that are **not in git**.
   Follow `SETUP-ONEDRIVE-DEBIAN.md` (in the `reinstall-backup/` folder): rclone is recommended.
   If you skip OneDrive setup, manually download from onedrive.com:
     - `reinstall-backup/ssh-gitconfig-2026-08-08.zip` (SSH keys + `.gitconfig`)
     - `reinstall-backup/MIGRATION-DEBIAN.md` and `SETUP-DEBIAN.md`
     - `devstream/.env`
     - `mini_pixel_canvas/py/bot/OAUTH.txt`
     - (optional) `devstream/data/*.json`, `mini_pixel_canvas/py/pixel_log*.db`,
       `mini_pixel_canvas/canvas_state.json`, `canvas_latest.png`
4. When the agent runs `sudo ...`, type your password in the opencode terminal when prompted.
   (Alternative: ask the agent to generate one `setup.sh` you run once with `sudo bash setup.sh`.)

## Phase 1 — Restore SSH keys + git config (agent)

Extract the zip (from OneDrive, or wherever you placed it):

```bash
mkdir -p ~/restore && cd ~/restore
# bring ssh-gitconfig-2026-08-08.zip here (rclone copy / manual download)
unzip ssh-gitconfig-2026-08-08.zip -d ~/
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub ~/.ssh/known_hosts* ~/.gitconfig
ssh -T git@github.com   # expect: Hi DeviousSiddy!
```

## Phase 2 — Install Docker, compose plugin, git, curl (agent, sudo)

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker
```

**[USER]** Log out and back in (or run `newgrp docker`) so the `docker` group takes effect.
Verify with `docker run hello-world` or `docker version`.

## Phase 3 — Clone the repos (agent)

```bash
mkdir -p ~/DevStream ~/Scripts
git clone git@github.com:DeviousSiddy/devstream.git ~/DevStream/devstream
git -C ~/DevStream/devstream checkout add/pixel-canvas
git clone git@github.com:DeviousSiddy/mini-pixel-canvas.git ~/Scripts/mini_pixel_canvas
```

## Phase 4 — Restore secrets (agent)

Secrets are gitignored and only exist in OneDrive. Do **not** commit them.

```bash
# ~/DevStream/devstream/.env  (from OneDrive, then fix the 3 paths for Linux)
mkdir -p ~/DevStream/devstream/data
mkdir -p ~/Scripts/mini_pixel_canvas/py/bot   # whole bot/ dir is gitignored
# ~/Scripts/mini_pixel_canvas/py/bot/OAUTH.txt  (from OneDrive)
```

`.env` must have these keys, with the path values changed from Windows to Linux
(placeholders; real token values come from the OneDrive copy):

```ini
TWITCH_OAUTH_TOKEN=<from OneDrive>
TWITCH_NICK=devioussiddy
TWITCH_REFRESH_TOKEN=<from OneDrive>
TWITCH_CLIENT_ID=<from OneDrive>
DISCORD_BOT_TOKEN=<from OneDrive>
DISCORD_PUB_KEY=<from OneDrive>
DISCORD_CLIENT_SECRET=<from OneDrive>
DISCORD_APP_ID=<from OneDrive>
GITHUB_PAT=<from OneDrive>
TGDB_API_KEY=<from OneDrive>
CANVAS_SOURCE_HOST=/home/<USER>/Scripts/mini_pixel_canvas
DEVSTREAM_DATA_DIR=/home/<USER>/DevStream/devstream/data
DEVSTREAM_ENV_FILE=/home/<USER>/DevStream/devstream/.env
```

Sanity check the tokens with `grep -c "=.\{20,\}" .env` (no label-polluted values like
"Access token …"). `docker compose config --quiet` must pass.

Optional: restore `data/*.json` overlay configs and the bot's `pixel_log.db` /
`canvas_state.json` / `canvas_latest.png` from OneDrive to overwrite the git-checked copies.

## Phase 5 — Build and start (agent)

```bash
cd ~/DevStream/devstream
docker compose up -d --build
```
(On Linux you build straight from the repo — the temp-copy workaround was a OneDrive/Windows quirk.)

## Phase 6 — Verify (agent)

```bash
docker compose ps                       # both Up
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/        # 200
curl -s http://localhost:3000/api/canvas/bot/status                    # {"available":true,"running":true|false}
docker logs pixel-canvas-bot --tail 50  # DB ready, canvas saved, HTTP up, Twitch+Discord login
curl -s -X POST http://localhost:3000/api/canvas/bot/stop              # stop works
curl -s http://localhost:3000/api/canvas/bot/status                    # running:false
curl -s -X POST http://localhost:3000/api/canvas/bot/start             # start works
```
Manual check: open `http://localhost:3000/console` (Canvas Overlays → Start/Stop Bot button).

## Phase 7 — Optional hardening

- Firewall if the machine is reachable on LAN: `sudo ufw allow 3000/tcp`
- Stack auto-starts with Docker because compose sets `restart: always|unless-stopped`
  and Docker is `enable`d.
- opencode config is trivial (empty `opencode.jsonc` stub) — nothing to restore.

## Reference

| Item | Value |
|---|---|
| DevStream web UI | `http://localhost:3000` (PORT env, port 3000) |
| Console | `http://localhost:3000/console` |
| Canvas settings | `http://localhost:3000/canvas-display` |
| Bot container | `pixel-canvas-bot` (restart: always) |
| Bot API | `/api/canvas/bot/{status,start,stop}` |
| Repos | github.com/DeviousSiddy/devstream (branch `add/pixel-canvas`), github.com/DeviousSiddy/mini-pixel-canvas |
| Runtime data | `~/DevStream/devstream/data/`, bot files under `~/Scripts/mini_pixel_canvas/` |
