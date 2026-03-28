.PHONY: build setup clean

all: build

setup:
	rustup target add wasm32-unknown-unknown
	cargo install wasm-bindgen-cli

build:
	cargo build --target wasm32-unknown-unknown --release
	wasm-bindgen target/wasm32-unknown-unknown/release/apotheosis_lib.wasm --out-dir ../website/pkg --target web

clean:
	cargo clean
	rm -rf ../website/pkg
