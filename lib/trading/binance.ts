import ccxt from "ccxt";
import { tr } from "zod/v4/locales";

export const binance = new ccxt.binance({
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_API_SECRET,
  options: {
    defaultType: "future",
  },
});

binance.enableDemoTrading(true)


// Note: setSandboxMode is deprecated for futures, using demo trading instead
