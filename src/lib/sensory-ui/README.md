# sensory-ui (vendored)

Copied from https://github.com/SatyamVyas04/sensory-ui (MIT), a copy-in
registry rather than an npm package. The upstream directory layout is kept, so
an update can be dropped in file by file.

Do not edit these files to change app behaviour. Configure the provider
instead, from `src/lib/sound.tsx`.

The one local change is in `config/registry.ts`: `packRegistry` upstream names
all nine packs, which defeats tree shaking and pulls every pack into the
bundle. Only the pack this app uses is listed. Search for "LOCAL CHANGE".
