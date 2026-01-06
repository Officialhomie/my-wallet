import { AppStore } from '../index';

/**
 * Selects all data needed for the WalletSelector component.
 * Combined selector to reduce coupling in the component itself.
 */
export const selectWalletSelectorData = (state: AppStore) => ({
  walletFarmInfo: state.systemSetup.walletFarmInfo,
  walletSelection: state.simulationConfig.walletSelection,
  setWalletSelectionMode: state.setWalletSelectionMode,
  setSingleWallet: state.setSingleWallet,
  toggleWallet: state.toggleWallet,
});

