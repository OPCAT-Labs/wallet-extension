# OPCAT Wallet

A browser extension wallet for OPCAT (Ordinal Protocol CAT) transactions.

## Prerequisites

- Node.js (v16 or higher)
- Yarn package manager
- Google Chrome browser

## Installation & Setup

### 1. Build Utils Package

First, build the utilities package:

```bash
cd utils
yarn build
```

### 2. Build Extension

Next, build the Chrome extension:

```bash
cd extensions
yarn build:chrome:mv3 && yarn build:chrome:mv3:dev
```

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** by toggling the switch in the top-right corner
3. Click **Load unpacked**
4. Select the `extensions/dist/chrome` folder from your project directory

The extension should now be installed and visible in your Chrome extensions list.

## Development

### Project Structure

```
opcat-wallet2/
├── packages/
│   ├── extension/     # Chrome extension source code
│   └── utils/         # Shared utilities and libraries
├── patches/           # Dependency patches
└── readme.md
```

### Available Scripts

In the `extensions` directory:
- `yarn build:chrome:mv3` - Build production version
- `yarn build:chrome:mv3:dev` - Build development version

In the `utils` directory:
- `yarn build` - Build utilities package

## Features

- OPCAT transaction support
- Bitcoin wallet functionality
- Browser extension interface
- Developer tools integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the build process
5. Submit a pull request

## License

[Add your license information here]
