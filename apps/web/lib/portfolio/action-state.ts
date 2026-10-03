export type PortfolioActionState = {
  error: string | null;
  notice: string | null;
};

export const EMPTY_PORTFOLIO_STATE: PortfolioActionState = {
  error: null,
  notice: null,
};
