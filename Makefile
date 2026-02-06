BUN ?= bun
PYTHON ?= python3
ENTRY ?= src/main.ts
OUT_DIR ?= bin
OUT ?= $(OUT_DIR)/agr-opentui
DIST_DIR ?= dist

.PHONY: build clean
.PHONY: test check
.PHONY: py-build py-publish py-publish-test
.PHONY: gen-embedded-skills

gen-embedded-skills:
	$(BUN) scripts/generate-embedded-skills.ts

build: gen-embedded-skills
	@mkdir -p $(OUT_DIR)
	$(BUN) build $(ENTRY) --compile --outfile $(OUT)

test:
	$(BUN) test

check:
	$(BUN) run typecheck
	$(BUN) test

py-build: gen-embedded-skills
	rm -rf $(DIST_DIR)
	mkdir -p agr_opentui/bin
	rm -f agr_opentui/bin/agr-opentui
	$(BUN) run build
	cp $(OUT) agr_opentui/bin/agr-opentui
	chmod +x agr_opentui/bin/agr-opentui
	$(PYTHON) -m build

py-publish: py-build
	$(PYTHON) -m twine upload $(DIST_DIR)/*

py-publish-test: py-build
	$(PYTHON) -m twine upload --repository testpypi $(DIST_DIR)/*

clean:
	rm -rf $(OUT_DIR)
