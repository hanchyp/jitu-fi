// Maps the backend-shaped mocks into the deposit screen's props for each `?state=`.
import type { ComponentProps } from "react";
import type { DepositScreen } from "@/components/vault/DepositScreen";
import type { PositionView, TenorOption, WalletView } from "@/components/vault/types";
import { POSITION_ACTIVE_WEEK, POSITION_ENROLLING_MONTH, WALLET, WALLET_FAUCET_USED, WALLET_LOW, type PositionResponse, type WalletMock } from "@/mocks/position";
import { CURRENT_SEASONS, CURRENT_SEASONS_WEEK_STARTED, MOCK_NOW, VAULT_RULES, type CurrentSeasonsResponse } from "@/mocks/season";

export const STATES = [
  "default",
  "faucet-cooldown",
  "insufficient-balance",
  "below-minimum",
  "pending",
  "success",
  "enrollment-closed",
  "other-tenor-active",
  "has-position",
  "wrong-network",
] as const;

export type DepositState = (typeof STATES)[number];
type ScreenProps = ComponentProps<typeof DepositScreen>;

const RULES = {
  minDeposit: VAULT_RULES.minDeposit,
  weightCap: VAULT_RULES.weightCap,
  faucetAmount: VAULT_RULES.faucetAmount,
  faucetCooldownSeconds: VAULT_RULES.faucetCooldownSeconds,
  countedGames: VAULT_RULES.countedGames,
};

const label = (tenor: keyof typeof VAULT_RULES.tenorLengths) => VAULT_RULES.tenorLengths[tenor].label;

function toOptions({ seasons }: CurrentSeasonsResponse): TenorOption[] {
  return seasons.map((s) => ({
    tenor: s.tenor,
    seasonId: s.seasonId,
    label: label(s.tenor),
    demoMinutes: VAULT_RULES.tenorLengths[s.tenor].demoMinutes,
    enrollSecondsLeft: s.status === "Enrollment" ? Math.max(0, s.start - MOCK_NOW) : 0,
    bonusPot: s.bonusPot,
    sponsorFunds: s.sponsorFunds,
    maturitySeconds: Math.max(0, s.end - MOCK_NOW),
  }));
}

function toWallet(w: WalletMock): WalletView {
  const ready = w.faucetLastClaim === null ? 0 : w.faucetLastClaim + VAULT_RULES.faucetCooldownSeconds - MOCK_NOW;
  return { balance: w.balance, faucetSecondsLeft: Math.max(0, ready) };
}

function toPosition(p: PositionResponse): PositionView {
  return {
    seasonId: p.seasonId,
    tenor: p.tenor,
    tenorLabel: label(p.tenor),
    status: p.seasonStatus === "Enrollment" ? "enrolling" : "active",
    principal: p.previewClaim.principal,
    baseYield: p.previewClaim.baseYield,
    bonus: p.previewClaim.bonus,
    secondsToStart: Math.max(0, p.start - MOCK_NOW),
    secondsToMaturity: Math.max(0, p.end - MOCK_NOW),
    gamesCounted: p.gamesCounted,
    countedGames: p.countedGames,
  };
}

const JUST_DEPOSITED = BigInt(250_000_000);

export function scenarioFor(state: DepositState): ScreenProps {
  const base: ScreenProps = {
    rules: RULES,
    wallet: toWallet(WALLET),
    options: toOptions(CURRENT_SEASONS),
    initialTenor: "week",
    position: null,
  };

  switch (state) {
    case "faucet-cooldown":
      return { ...base, wallet: toWallet(WALLET_FAUCET_USED) };
    case "insufficient-balance":
      return { ...base, wallet: toWallet(WALLET_LOW), initialAmount: "500" };
    case "below-minimum":
      return { ...base, initialAmount: "5" };
    case "pending":
      return { ...base, initialAmount: "250", initialPhase: "pending" };
    case "success": {
      const week = base.options[0];
      return {
        ...base,
        wallet: { ...base.wallet, balance: WALLET.balance - JUST_DEPOSITED },
        initialPhase: "success",
        initialDeposited: JUST_DEPOSITED,
        position: {
          seasonId: week.seasonId,
          tenor: week.tenor,
          tenorLabel: week.label,
          status: "enrolling",
          principal: JUST_DEPOSITED,
          baseYield: BigInt(0),
          bonus: BigInt(0),
          secondsToStart: week.enrollSecondsLeft,
          secondsToMaturity: week.maturitySeconds,
          gamesCounted: 0,
          countedGames: RULES.countedGames,
        },
      };
    }
    case "enrollment-closed":
      return { ...base, options: toOptions(CURRENT_SEASONS_WEEK_STARTED), initialAmount: "250" };
    case "other-tenor-active":
      return { ...base, initialAmount: "250", position: toPosition(POSITION_ENROLLING_MONTH) };
    case "has-position":
      return {
        ...base,
        wallet: { ...base.wallet, balance: WALLET.balance - POSITION_ACTIVE_WEEK.principal },
        options: toOptions(CURRENT_SEASONS_WEEK_STARTED),
        position: toPosition(POSITION_ACTIVE_WEEK),
      };
    default:
      return base;
  }
}
