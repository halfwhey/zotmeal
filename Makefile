PKG_DIR := packages/$(PACKAGE)

.PHONY: _require_new_version
_require_new_version:
	@[ -n "$(NEW_VERSION)" ] || (printf 'error: NEW_VERSION is not set. Usage: PACKAGE=zotmeal-cli make release NEW_VERSION=vX.Y.Z\n' >&2; exit 1)

.PHONY: _require_package
_require_package:
	@[ -n "$(PACKAGE)" ] || (printf 'error: PACKAGE is not set. Usage: PACKAGE=zotmeal-cli make release NEW_VERSION=vX.Y.Z\n' >&2; exit 1)

.PHONY: release
release: _require_new_version _require_package ## Bump package version, commit, tag, push, create GitHub release (PACKAGE=zotmeal-cli make release NEW_VERSION=vX.Y.Z)
	cd $(PKG_DIR) && npm version $(shell printf '%s' "$(NEW_VERSION)" | sed 's/^v//') --no-git-tag-version
	printf '%s\n' "$(NEW_VERSION)" > VERSION
	git add -A
	git commit -m "$(NEW_VERSION)"
	git tag "$(NEW_VERSION)"
	git push --follow-tags
	gh release create "$(NEW_VERSION)" --generate-notes

.PHONY: install
install: ## Install dependencies
	bun install

.PHONY: build
build: ## Build the CLI bundle
	bun build packages/zotmeal-cli/src/index.ts --outfile packages/zotmeal-cli/dist/zotmeal.js --target node --minify
	perl -i -pe 's|#!/usr/bin/env bun|#!/usr/bin/env node|' packages/zotmeal-cli/dist/zotmeal.js

.PHONY: test
test: ## Run tests
	bun test

.PHONY: typecheck
typecheck: ## Run TypeScript type checking
	tsc --build
	@[ -d apps/mobile/node_modules ] && tsc --noEmit -p apps/mobile || true

.PHONY: generate-types
generate-types: ## Regenerate item types from Zotero API schema
	bun run scripts/generate-item-types.ts

.PHONY: publish
publish: build ## Build and publish CLI to npm
	cd packages/zotmeal-cli && npm publish --access public
