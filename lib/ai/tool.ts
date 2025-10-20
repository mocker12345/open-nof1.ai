import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";
import {
  getCurrentMarketState,
  formatMarketState,
} from "../trading/current-market-state";
import {
  getAccountInformationAndPerformance,
  formatAccountPerformance,
} from "../trading/account-information-and-performance";

const exa = new Exa(process.env.EXA_API_KEY);

// Web search tool
export const searchTool = tool({
  name: "search",
  description: "Search the web for information",
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    const result = await exa.searchAndContents(query, {
      text: true,
      type: "auto",
    });
    return result;
  },
});

// Market state tool
export const getMarketStateTool = tool({
  name: "getMarketState",
  description:
    "Get current market state for a cryptocurrency including price, technical indicators (EMA, MACD, RSI, ATR), open interest, and funding rates",
  inputSchema: z.object({
    symbol: z
      .string()
      .describe(
        "Trading pair symbol (e.g., 'BTC/USDT', 'ETH/USDT', or just 'BTC', 'ETH')"
      ),
  }),
  execute: async ({ symbol }) => {
    const marketState = await getCurrentMarketState(symbol);
    return formatMarketState(marketState);
  },
});

// Account information tool
export const getAccountInfoTool = tool({
  name: "getAccountInfo",
  description:
    "Get account information and performance including balance, positions, PnL, and Sharpe ratio",
  inputSchema: z.object({
    symbols: z
      .array(z.string())
      .describe(
        "Array of trading symbols to check positions for (e.g., ['BTC/USDT', 'ETH/USDT'])"
      ),
    initialCapital: z
      .number()
      .optional()
      .describe(
        "Initial capital for return calculation (optional, defaults to 10000)"
      ),
  }),
  execute: async ({ symbols, initialCapital }) => {
    const accountPerformance = await getAccountInformationAndPerformance(
      symbols,
      initialCapital
    );
    return formatAccountPerformance(accountPerformance);
  },
});

// Export all tools
export const tools = {
  search: searchTool,
  getMarketState: getMarketStateTool,
  getAccountInfo: getAccountInfoTool,
};
