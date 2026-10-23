export type SkillName = "BOOST" | "INSURANCE" | "LOCK" | "FLIP" | "SWAP" | "FREEZE";

export type SkillTarget = {
  id: string;
  label: string;
  owner?: "you" | "opponent";
  affected?: boolean;
};

export type SkillCard = {
  id: string;
  skill: SkillName;
  disabled?: boolean;
  disabledReason?: string;
};

export type SkillHandProps = {
  cards: readonly SkillCard[];
  /** The picks allowed for the selected skill. The owner decides this list. */
  targets?: readonly SkillTarget[];
  selectedId?: string;
  selectedTargetId?: string;
  usedThisRound?: boolean;
  live?: boolean;
  onSelect?: (card: SkillCard) => void;
  onTargetSelect?: (target: SkillTarget) => void;
  onCast?: (card: SkillCard, target: SkillTarget) => void;
  className?: string;
};
