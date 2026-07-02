# snip-cli

Zero-dependency Node.js CLI for the [Snip](https://github.com/pohcb64310/DemoTest/tree/backend) URL shortener.

Requires **Node >= 18** (uses built-in global `fetch`).

## Install

```sh
npm link          # from this directory — adds `snip` to PATH
# or
npm install -g .
```

## Usage

```
snip add <url>    Shorten a URL; prints the short link
snip ls           List all links  (code / hits / original URL)
snip open <code>  Open a short link in the system browser
snip help         Show this message
```

### Examples

```sh
$ snip add https://example.com/very/long/path
http://localhost:3000/aB3xYz

$ snip ls
CODE    HITS  URL
------  ----  ----------------------------------------------------
aB3xYz     2  https://example.com/very/long/path

$ snip open aB3xYz
Opening https://example.com/very/long/path
```

## Configuration

| Variable   | Default                 | Description       |
|------------|-------------------------|-------------------|
| `SNIP_API` | `http://localhost:3000` | Backend base URL  |

## Wrappers

| File       | Platform             |
|------------|----------------------|
| `snip`     | Unix / macOS (sh)    |
| `snip.cmd` | Windows cmd          |
| `snip.ps1` | Windows PowerShell   |

`npm link` / `npm install -g` creates these automatically.
Errors print to **stderr** and exit with code **1**.