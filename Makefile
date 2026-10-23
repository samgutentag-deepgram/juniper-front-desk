.PHONY: init install check start dev test clean

init: install

install:
	pnpm install --frozen-lockfile

# Typecheck, plus the style-pack seal: literals live only in src/styles/packs/.
check:
	pnpm typecheck
	@if grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(|oklch\(|font-family:|fontFamily' src \
	  --include='*.css' --include='*.ts' --include='*.tsx' --include='*.js' \
	  | grep -v 'src/styles/packs/' | grep -v 'var(--'; then \
	  echo "LEAK: literals outside pack"; exit 1; else echo "ok   style pack sealed"; fi

start:
	pnpm build && pnpm start

dev:
	pnpm dev

test:
	pnpm test

clean:
	rm -rf node_modules dist dist-server
