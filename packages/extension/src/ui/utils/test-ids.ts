/**
 * Centralized test IDs for E2E testing
 * Both React components and test specs should import from this file
 */

export const TestIds = {
  // Welcome Screen
  WELCOME: {
    CREATE_WALLET_BUTTON: 'welcome-create-wallet-button',
    IMPORT_WALLET_BUTTON: 'welcome-import-wallet-button',
    CONNECT_HARDWARE_BUTTON: 'welcome-connect-hardware-button',
    LOGO: 'welcome-logo',
    DESCRIPTION_TEXT: 'welcome-description-text',
  },

  // Create Wallet Flow
  CREATE_WALLET: {
    MNEMONIC_12_OPTION: 'create-wallet-12-words',
    MNEMONIC_24_OPTION: 'create-wallet-24-words',
    MNEMONIC_DISPLAY: 'create-wallet-mnemonic-display',
    MNEMONIC_WORD: 'create-wallet-mnemonic-word',
    MNEMONIC_CONFIRM_INPUT: 'create-wallet-mnemonic-confirm',
    MNEMONIC_SAVE_CHECKBOX: 'create-wallet-save-checkbox',
    COPY_MNEMONIC_BUTTON: 'create-wallet-copy-mnemonic',
    CONTINUE_BUTTON: 'create-wallet-continue',
    BACK_BUTTON: 'create-wallet-back',
    // Step 2 - Address Selection
    ADDRESS_TYPE_OPTION: 'create-wallet-address-type',
    CUSTOM_HDPATH_INPUT: 'create-wallet-custom-hdpath',
    PASSPHRASE_INPUT: 'create-wallet-passphrase',
    STEP2_CONTINUE_BUTTON: 'create-wallet-step2-continue',
  },

  // Import Wallet Flow
  IMPORT_WALLET: {
    RESTORE_WALLET_OPTION: 'restore-wallet-option',
    MNEMONIC_INPUT: 'import-wallet-mnemonic-input',
    MNEMONIC_WORD: 'import-wallet-mnemonic-word',
    PRIVATE_KEY_INPUT: 'import-wallet-private-key-input',
    MNEMONIC_TAB: 'import-wallet-mnemonic-tab',
    PRIVATE_KEY_TAB: 'import-wallet-private-key-tab',
    IMPORT_BUTTON: 'import-wallet-import-button',
    CONTINUE_BUTTON: 'import-wallet-continue-button',
    ERROR_MESSAGE: 'import-wallet-error-message',
  },

  // Password Setup
  PASSWORD: {
    NEW_PASSWORD_INPUT: 'password-new-input',
    CONFIRM_PASSWORD_INPUT: 'password-confirm-input',
    CONTINUE_BUTTON: 'password-continue-button',
    CREATE_BUTTON: 'password-create-button',
    STRENGTH_INDICATOR: 'password-strength-indicator',
    ERROR_MESSAGE: 'password-error-message',
  },

  // Unlock Screen
  UNLOCK: {
    PASSWORD_INPUT: 'unlock-password-input',
    UNLOCK_BUTTON: 'unlock-button',
    FORGOT_PASSWORD_LINK: 'unlock-forgot-password',
    ERROR_MESSAGE: 'unlock-error-message',
  },

  // Main Wallet Screen
  WALLET: {
    BALANCE_DISPLAY: 'wallet-balance-display',
    RECEIVE_BUTTON: 'wallet-receive-button',
    SEND_BUTTON: 'wallet-send-button',
    ACCOUNT_SELECTOR: 'wallet-account-selector',
    WALLET_SWITCHER: 'wallet-switcher-button',
    NETWORK_INDICATOR: 'wallet-network-indicator',
    SETTINGS_BUTTON: 'wallet-settings-button',
    TRANSACTION_LIST: 'wallet-transaction-list',
    ASSET_LIST: 'wallet-asset-list',
  },

  // Account Management
  ACCOUNT_MANAGEMENT: {
    ADD_WALLET_BUTTON: 'account-add-wallet-button',
    WALLET_LIST: 'account-wallet-list',
    WALLET_ITEM: 'account-wallet-item',
    CREATE_NEW_WALLET_OPTION: 'account-create-new-wallet',
    RESTORE_PRIVATE_KEY_OPTION: 'account-restore-private-key',
    PRIVATE_KEY_INPUT: 'account-private-key-input',
    CONTINUE_BUTTON: 'account-continue-button',
    STEP2_CONTINUE_BUTTON: 'account-step2-continue-button',
    ADDRESS_DISPLAY: 'account-address-display',
    ADDRESS_COPY_BUTTON: 'account-address-copy-button',
    BALANCE_DISPLAY: 'account-balance-display',
  },

  // Version Notice Popup
  VERSION_NOTICE: {
    POPUP: 'version-notice-popup',
    GOT_IT_BUTTON: 'version-notice-got-it-button',
  },

  // Send Transaction
  SEND: {
    RECIPIENT_INPUT: 'send-recipient-input',
    AMOUNT_INPUT: 'send-amount-input',
    FEE_SELECTOR: 'send-fee-selector',
    CUSTOM_FEE_INPUT: 'send-custom-fee-input',
    MAX_BUTTON: 'send-max-button',
    NEXT_BUTTON: 'send-next-button',
    CONTINUE_BUTTON: 'send-continue-button',
    CONFIRM_BUTTON: 'send-confirm-button',
    SIGN_AND_PAY_BUTTON: 'send-sign-and-pay-button',
    REJECT_BUTTON: 'send-reject-button',
    ADDRESS_ERROR: 'send-address-error',
    AMOUNT_ERROR: 'send-amount-error',
  },

  // Transaction Success
  TX_SUCCESS: {
    CONTAINER: 'tx-success-container',
    DONE_BUTTON: 'tx-success-done-button',
    VIEW_EXPLORER_BUTTON: 'tx-success-view-explorer',
  },

  // Account Select (switch account on main page)
  ACCOUNT_SELECT: {
    CONTAINER: 'account-select-container',
    ADDRESS_DISPLAY: 'account-select-address',
    SWITCH_ACCOUNT_BUTTON: 'account-select-switch-button',
    COPY_ADDRESS_BUTTON: 'account-select-copy-button',
  },

  // Settings
  SETTINGS: {
    LANGUAGE_SELECTOR: 'settings-language-selector',
    CURRENCY_SELECTOR: 'settings-currency-selector',
    NETWORK_SELECTOR: 'settings-network-selector',
    ADDRESS_TYPE_SELECTOR: 'settings-address-type-selector',
    AUTO_LOCK_SELECTOR: 'settings-auto-lock-selector',
    EXPORT_MNEMONIC_BUTTON: 'settings-export-mnemonic',
    EXPORT_PRIVATE_KEY_BUTTON: 'settings-export-private-key',
    CHANGE_PASSWORD_BUTTON: 'settings-change-password',
    CONNECTED_SITES_BUTTON: 'settings-connected-sites',
    ABOUT_BUTTON: 'settings-about',
  },

  // CAT20 Token
  CAT20: {
    TOKEN_LIST: 'cat20-token-list',
    TOKEN_ITEM: 'cat20-token-item',
    TOKEN_BALANCE: 'cat20-token-balance',
    SEND_BUTTON: 'cat20-send-button',
    MERGE_BUTTON: 'cat20-merge-button',
    MERGE_CONFIRM_BUTTON: 'cat20-merge-confirm',
    MERGE_HISTORY_BUTTON: 'cat20-merge-history',
    // CAT20 Token Screen
    TOKEN_SCREEN: 'cat20-token-screen',
    TOKEN_NAME: 'cat20-token-name',
    TOKEN_AMOUNT: 'cat20-token-amount',
    // Send CAT20 Screen
    SEND_SCREEN: 'send-cat20-screen',
    SEND_RECIPIENT_INPUT: 'send-cat20-address-input',
    SEND_AMOUNT_INPUT: 'send-cat20-amount-input',
    SEND_NEXT_BUTTON: 'send-cat20-next-button',
    // Sign PSBT
    SIGN_BUTTON: 'cat20-sign-button',
  },

  // Asset Tabs
  ASSET_TAB: {
    PREFIX: 'asset-tab',
    CAT_TAB: 'asset-tab-cat',
    // CAT sub-tabs (CAT20/CAT721)
    CAT_TAB_PREFIX: 'cat-tab',
    CAT20_TAB: 'cat-tab-cat20',
    CAT721_TAB: 'cat-tab-cat721',
  },

  // CAT721 NFT
  CAT721: {
    COLLECTION_LIST: 'cat721-collection-list',
    COLLECTION_ITEM: 'cat721-collection-item',
    COLLECTION_SCREEN: 'cat721-collection-screen',
    NFT_GRID: 'cat721-nft-grid',
    NFT_ITEM: 'cat721-nft-item',
    NFT_SCREEN: 'cat721-nft-screen',
    NFT_IMAGE: 'cat721-nft-image',
    NFT_NAME: 'cat721-nft-name',
    NFT_ATTRIBUTES: 'cat721-nft-attributes',
    SEND_BUTTON: 'cat721-send-button',
    // Send CAT721 Screen
    SEND_SCREEN: 'send-cat721-screen',
    SEND_RECIPIENT_INPUT: 'send-cat721-address-input',
    SEND_NEXT_BUTTON: 'send-cat721-next-button',
  },

  // Security
  SECURITY: {
    AUTO_LOCK_TIMER: 'security-auto-lock-timer',
    PASSWORD_MODAL: 'security-password-modal',
    PASSWORD_INPUT: 'security-password-input',
    CONFIRM_BUTTON: 'security-confirm-button',
    CANCEL_BUTTON: 'security-cancel-button',
    WARNING_MESSAGE: 'security-warning-message',
  },

  // DApp Approval
  APPROVAL: {
    SITE_NAME: 'approval-site-name',
    SITE_URL: 'approval-site-url',
    PERMISSION_LIST: 'approval-permission-list',
    APPROVE_BUTTON: 'approval-approve-button',
    REJECT_BUTTON: 'approval-reject-button',
    TRANSACTION_DETAILS: 'approval-transaction-details',
    MESSAGE_CONTENT: 'approval-message-content',
  },

  // Common Components
  COMMON: {
    LOADING_SPINNER: 'common-loading-spinner',
    ERROR_MESSAGE: 'common-error-message',
    SUCCESS_MESSAGE: 'common-success-message',
    MODAL_CLOSE_BUTTON: 'common-modal-close',
    BACK_BUTTON: 'common-back-button',
    COPY_BUTTON: 'common-copy-button',
    TOAST_MESSAGE: 'common-toast-message',
  },
} as const;

// Type helper to get all test IDs
export type TestId = typeof TestIds[keyof typeof TestIds][keyof typeof TestIds[keyof typeof TestIds]];