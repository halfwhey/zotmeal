PKG_DIR := packages/$(PACKAGE)

.PHONY: install build test typecheck generate-types \
        version-patch version-minor version-major \
        release-patch release-minor release-major \
        publish

install:
	bun install

build:
	bun build packages/zotmeal-cli/src/index.ts --outfile packages/zotmeal-cli/dist/zotmeal.js --target node --minify
	sed -i '1s|#!/usr/bin/env bun|#!/usr/bin/env node|' packages/zotmeal-cli/dist/zotmeal.js

test:
	bun test

typecheck:
	tsc --build
	@[ -d apps/mobile/node_modules ] && tsc --noEmit -p apps/mobile || true

generate-types:
	bun run scripts/generate-item-types.ts

version-patch:
	cd $(PKG_DIR) && npm version patch --no-git-tag-version

version-minor:
	cd $(PKG_DIR) && npm version minor --no-git-tag-version

version-major:
	cd $(PKG_DIR) && npm version major --no-git-tag-version

release-patch: version-patch
	$(MAKE) _release

release-minor: version-minor
	$(MAKE) _release

release-major: version-major
	$(MAKE) _release

_release:
	$(eval NEW_VERSION := $(shell node -p "require('./$(PKG_DIR)/package.json').version"))
	git add -A
	git commit -m "v$(NEW_VERSION)"
	git tag "v$(NEW_VERSION)"
	@echo "Tagged v$(NEW_VERSION). Run 'git push --follow-tags' to push."

publish: build
	cd packages/zotmeal-cli && npm publish --access public
