aws --profile snowboardsdb \
  --endpoint-url https://storage.yandexcloud.net \
  --region ru-central1 \
  s3 sync images/ s3://snowboardsdb/images/

## GitHub Pages

`.github/workflows/publish.yml` builds `web/` after every push to `main`
(the current default branch) and commits the output to the `main` branch of
`snowboardsdb/snowboardsdb.github.io`. The workflow can also be run manually
from the Actions tab.

One-time setup:

1. Create a fine-grained personal access token on GitHub. Give it access only to
   `snowboardsdb/snowboardsdb.github.io` with **Contents: Read and write**.
2. In `snowboardsdb/snowboardsdb`, open **Settings → Secrets and variables → Actions**
   and save the token as a repository secret named `PAGES_TOKEN`.
3. In `snowboardsdb/snowboardsdb.github.io`, set **Settings → Pages → Build and
   deployment → Source** to **Deploy from a branch**, branch `main`, folder `/ (root)`.

Renew `PAGES_TOKEN` before the token expires.

The workflow preserves `.github`, `.gitignore`, and `CNAME` in the Pages
repository and adds `.nojekyll`. It commits only when the generated files change.
