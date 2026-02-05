BUN ?= bun
ENTRY ?= src/main.ts
OUT_DIR ?= bin
OUT ?= $(OUT_DIR)/agr-tui

.PHONY: build clean

build:
	@mkdir -p $(OUT_DIR)
	$(BUN) build $(ENTRY) --compile --outfile $(OUT)

clean:
	rm -rf $(OUT_DIR)
