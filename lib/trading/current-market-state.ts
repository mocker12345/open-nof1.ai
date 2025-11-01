import { EMA, MACD, RSI, ATR, BollingerBands, Stochastic, ADX } from "technicalindicators";
import { binance } from "./binance";

export interface MarketState {
  // Current indicators
  current_price: number;
  current_ema20: number;
  current_macd: number;
  current_rsi: number;
  current_bollinger_upper: number;
  current_bollinger_lower: number;
  current_stoch_k: number;
  current_stoch_d: number;
  current_adx: number;
  current_pdi: number;  // +DI (Positive Directional Indicator)
  current_ndi: number;  // -DI (Negative Directional Indicator)

  // Open Interest
  open_interest: {
    latest: number;
    average: number;
  };

  // Funding Rate
  funding_rate: number;

  // Intraday series (by minute)
  intraday: {
    mid_prices: number[];
    ema_20: number[];
    macd: number[];
    rsi_7: number[];
    rsi_14: number[];
    bollinger_upper: number[];
    bollinger_lower: number[];
    bollinger_middle: number[];
    stoch_k: number[];
    stoch_d: number[];
    adx: number[];
    pdi: number[];  // +DI series
    ndi: number[];  // -DI series
  };

  // Longer-term context (4-hour timeframe)
  longer_term: {
    ema_20: number;
    ema_50: number;
    atr_3: number;
    atr_14: number;
    current_volume: number;
    average_volume: number;
    macd: number[];
    rsi_14: number[];
    bollinger_upper_4h: number[];
    bollinger_lower_4h: number[];
    bollinger_middle_4h: number[];
    stoch_k_4h: number[];
    stoch_d_4h: number[];
    adx_4h: number[];
    pdi_4h: number[];  // +DI series (4h)
    ndi_4h: number[];  // -DI series (4h)
  };
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(values: number[], period: number): number[] {
  const emaValues = EMA.calculate({ values, period });
  return emaValues;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): number[] {
  const macdValues = MACD.calculate({
    values,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  return macdValues.map((v) => v.MACD || 0);
}

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(values: number[], period: number): number[] {
  const rsiValues = RSI.calculate({ values, period });
  return rsiValues;
}

/**
 * Calculate ATR (Average True Range)
 */
function calculateATR(
  high: number[],
  low: number[],
  close: number[],
  period: number
): number[] {
  const atrValues = ATR.calculate({ high, low, close, period });
  return atrValues;
}

/**
 * Calculate ADX (Average Directional Index) with DI lines
 */
function calculateADX(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14
): { adx: number[]; pdi: number[]; ndi: number[] } {
  const adxValues = ADX.calculate({ high, low, close, period });
  return {
    adx: adxValues.map(v => v.adx || 0),
    pdi: adxValues.map(v => v.pdi || 0),  // +DI (Positive DI)
    ndi: adxValues.map(v => v.mdi || 0)   // -DI (Negative DI, called mdi in library)
  };
}

/**
 * Fetch current market state for a given coin symbol
 * @param symbol - Trading pair symbol (e.g., 'BTC/USDT')
 * @returns Market state with all technical indicators
 */
export async function getCurrentMarketState(
  symbol: string
): Promise<MarketState> {
  try {
    // Normalize symbol format for Binance
    const normalizedSymbol = symbol.includes("/") ? symbol : `${symbol}/USDT`;

    // Fetch 3-minute OHLCV data (last 100 candles for intraday analysis)
    const ohlcv3m = await binance.fetchOHLCV(
      normalizedSymbol,
      "3m",
      undefined,
      100
    );

    // Fetch 4-hour OHLCV data (last 100 candles for longer-term context)
    const ohlcv4h = await binance.fetchOHLCV(
      normalizedSymbol,
      "4h",
      undefined,
      100
    );

    // Extract price data from 3-minute candles
    const closes3m = ohlcv3m.map((candle) => Number(candle[4])); // Close prices

    // Extract price data from 4-hour candles
    const closes4h = ohlcv4h.map((candle) => Number(candle[4]));
    const highs4h = ohlcv4h.map((candle) => Number(candle[2]));
    const lows4h = ohlcv4h.map((candle) => Number(candle[3]));
    const volumes4h = ohlcv4h.map((candle) => Number(candle[5]));

    // Calculate intraday indicators (3-minute timeframe)
    const ema20_3m = calculateEMA(closes3m, 20);
    const macd_3m = calculateMACD(closes3m);
    const rsi7_3m = calculateRSI(closes3m, 7);
    const rsi14_3m = calculateRSI(closes3m, 14);

    // Calculate Bollinger Bands (3-minute timeframe)
    const bollingerBands3m = BollingerBands.calculate({
      period: 20,
      stdDev: 2,
      values: closes3m
    });

    // Calculate Stochastic (3-minute timeframe)
    const stochastic3m = Stochastic.calculate({
      high: ohlcv3m.map(candle => Number(candle[2])),
      low: ohlcv3m.map(candle => Number(candle[3])),
      close: closes3m,
      period: 14,
      signalPeriod: 3
    });

    // Calculate ADX (3-minute timeframe)
    const adx3mResult = calculateADX(
      ohlcv3m.map(candle => Number(candle[2])),
      ohlcv3m.map(candle => Number(candle[3])),
      closes3m,
      14
    );

    // Calculate longer-term indicators (4-hour timeframe)
    const ema20_4h = calculateEMA(closes4h, 20);
    const ema50_4h = calculateEMA(closes4h, 50);
    const atr3_4h = calculateATR(highs4h, lows4h, closes4h, 3);
    const atr14_4h = calculateATR(highs4h, lows4h, closes4h, 14);
    const macd_4h = calculateMACD(closes4h);
    const rsi14_4h = calculateRSI(closes4h, 14);

    // Calculate Bollinger Bands (4-hour timeframe)
    const bollingerBands4h = BollingerBands.calculate({
      period: 20,
      stdDev: 2,
      values: closes4h
    });

    // Calculate Stochastic (4-hour timeframe)
    const stochastic4h = Stochastic.calculate({
      high: highs4h,
      low: lows4h,
      close: closes4h,
      period: 14,
      signalPeriod: 3
    });

    // Calculate ADX (4-hour timeframe)
    const adx4hResult = calculateADX(highs4h, lows4h, closes4h, 14);

    // Get last 10 values for intraday series
    const last10MidPrices = closes3m.slice(-10);
    const last10EMA20 = ema20_3m.slice(-10).map((v) => Number(v) || 0);
    const last10MACD = macd_3m.slice(-10).map((v) => Number(v) || 0);
    const last10RSI7 = rsi7_3m.slice(-10).map((v) => Number(v) || 0);
    const last10RSI14 = rsi14_3m.slice(-10).map((v) => Number(v) || 0);

    // Get last 10 MACD and RSI values for 4-hour timeframe
    const last10MACD4h = macd_4h.slice(-10).map((v) => Number(v) || 0);
    const last10RSI14_4h = rsi14_4h.slice(-10).map((v) => Number(v) || 0);

    // Current values (latest)
    const current_price = Number(closes3m[closes3m.length - 1]) || 0;
    const current_ema20 = Number(ema20_3m[ema20_3m.length - 1]) || 0;
    const current_macd = Number(macd_3m[macd_3m.length - 1]) || 0;
    const current_rsi = Number(rsi7_3m[rsi7_3m.length - 1]) || 0;

    // Bollinger Bands current values
    const current_bollinger_upper = Number(bollingerBands3m[bollingerBands3m.length - 1]?.upper) || 0;
    const current_bollinger_lower = Number(bollingerBands3m[bollingerBands3m.length - 1]?.lower) || 0;

    // Stochastic current values
    const current_stoch_k = Number(stochastic3m[stochastic3m.length - 1]?.k) || 0;
    const current_stoch_d = Number(stochastic3m[stochastic3m.length - 1]?.d) || 0;

    // Fetch open interest and funding rate for perpetual futures
    const openInterestData = { latest: 0, average: 0 };
    let fundingRate = 0;

    try {
      // Try to fetch open interest
      const perpSymbol = normalizedSymbol.replace("/", "");
      const openInterest = await binance.fetchOpenInterest(perpSymbol);

      if (openInterest && typeof openInterest.openInterestAmount === "number") {
        openInterestData.latest = openInterest.openInterestAmount;
        openInterestData.average = openInterest.openInterestAmount; // Using same value as average
      }

      // Try to fetch funding rate
      const fundingRates = await binance.fetchFundingRate(normalizedSymbol);
      if (fundingRates && typeof fundingRates.fundingRate === "number") {
        fundingRate = fundingRates.fundingRate;
      }
    } catch (error) {
      console.warn("Could not fetch open interest or funding rate:", error);
      // Continue with default values
    }

    // Calculate average volume for 4-hour timeframe
    const averageVolume4h =
      volumes4h.reduce((sum, vol) => sum + vol, 0) / volumes4h.length;
    const currentVolume4h = volumes4h[volumes4h.length - 1];

    // Prepare intraday series for new indicators
    const last10BollingerUpper = bollingerBands3m.slice(-10).map(b => Number(b?.upper) || 0);
    const last10BollingerLower = bollingerBands3m.slice(-10).map(b => Number(b?.lower) || 0);
    const last10BollingerMiddle = bollingerBands3m.slice(-10).map(b => Number(b?.middle) || 0);
    const last10StochK = stochastic3m.slice(-10).map(s => Number(s?.k) || 0);
    const last10StochD = stochastic3m.slice(-10).map(s => Number(s?.d) || 0);
    const last10ADX = adx3mResult.adx.slice(-10).map(v => Number(v) || 0);
    const last10PDI = adx3mResult.pdi.slice(-10).map(v => Number(v) || 0);
    const last10NDI = adx3mResult.ndi.slice(-10).map(v => Number(v) || 0);

    // Prepare 4h indicators
    const last10BollingerUpper4h = bollingerBands4h.slice(-10).map(b => Number(b?.upper) || 0);
    const last10BollingerLower4h = bollingerBands4h.slice(-10).map(b => Number(b?.lower) || 0);
    const last10BollingerMiddle4h = bollingerBands4h.slice(-10).map(b => Number(b?.middle) || 0);
    const last10StochK4h = stochastic4h.slice(-10).map(s => Number(s?.k) || 0);
    const last10StochD4h = stochastic4h.slice(-10).map(s => Number(s?.d) || 0);
    const last10ADX4h = adx4hResult.adx.slice(-10).map(v => Number(v) || 0);
    const last10PDI4h = adx4hResult.pdi.slice(-10).map(v => Number(v) || 0);
    const last10NDI4h = adx4hResult.ndi.slice(-10).map(v => Number(v) || 0);

    return {
      current_price,
      current_ema20,
      current_macd,
      current_rsi,
      current_bollinger_upper,
      current_bollinger_lower,
      current_stoch_k,
      current_stoch_d,
      current_adx: Number(adx3mResult.adx[adx3mResult.adx.length - 1]) || 0,
      current_pdi: Number(adx3mResult.pdi[adx3mResult.pdi.length - 1]) || 0,
      current_ndi: Number(adx3mResult.ndi[adx3mResult.ndi.length - 1]) || 0,
      open_interest: openInterestData,
      funding_rate: fundingRate,
      intraday: {
        mid_prices: last10MidPrices,
        ema_20: last10EMA20,
        macd: last10MACD,
        rsi_7: last10RSI7,
        rsi_14: last10RSI14,
        bollinger_upper: last10BollingerUpper,
        bollinger_lower: last10BollingerLower,
        bollinger_middle: last10BollingerMiddle,
        stoch_k: last10StochK,
        stoch_d: last10StochD,
        adx: last10ADX,
        pdi: last10PDI,
        ndi: last10NDI,
      },
      longer_term: {
        ema_20: Number(ema20_4h[ema20_4h.length - 1]) || 0,
        ema_50: Number(ema50_4h[ema50_4h.length - 1]) || 0,
        atr_3: Number(atr3_4h[atr3_4h.length - 1]) || 0,
        atr_14: Number(atr14_4h[atr14_4h.length - 1]) || 0,
        current_volume: currentVolume4h,
        average_volume: averageVolume4h,
        macd: last10MACD4h,
        rsi_14: last10RSI14_4h,
        bollinger_upper_4h: last10BollingerUpper4h,
        bollinger_lower_4h: last10BollingerLower4h,
        bollinger_middle_4h: last10BollingerMiddle4h,
        stoch_k_4h: last10StochK4h,
        stoch_d_4h: last10StochD4h,
        adx_4h: last10ADX4h,
        pdi_4h: last10PDI4h,
        ndi_4h: last10NDI4h,
      },
    };
  } catch (error) {
    console.error("Error fetching market state:", error);
    throw error;
  }
}

/**
 * Format market state as a human-readable string
 */
/**
 * Fetch current market state for multiple coin symbols
 * @param symbols - Array of trading pair symbols (e.g., ['BTC/USDT', 'ETH/USDT'])
 * @returns Object with market states for all symbols
 */
export async function getAllMarketStates(
  symbols: string[] = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "DOGE/USDT", "XRP/USDT"]
): Promise<{ [symbol: string]: MarketState }> {
  const marketStates: { [symbol: string]: MarketState } = {};

  // Fetch market states for all symbols in parallel
  const promises = symbols.map(async (symbol) => {
    try {
      const state = await getCurrentMarketState(symbol);
      return { symbol, state };
    } catch (error) {
      console.error(`Error fetching market state for ${symbol}:`, error);
      return { symbol, state: null };
    }
  });

  const results = await Promise.all(promises);

  results.forEach(({ symbol, state }) => {
    if (state) {
      marketStates[symbol] = state;
    }
  });

  return marketStates;
}

/**
 * Format market state for a specific coin symbol
 */
export function formatCoinMarketState(state: MarketState, coinName: string): string {
  return `
### ALL ${coinName} DATA

**Current Snapshot:**
- current_price = ${state.current_price.toFixed(2)}
- current_ema20 = ${state.current_ema20.toFixed(3)}
- current_macd = ${state.current_macd.toFixed(3)}
- current_rsi (7 period) = ${state.current_rsi.toFixed(3)}
- current_adx = ${state.current_adx.toFixed(3)}
- current_pdi (+DI) = ${state.current_pdi.toFixed(3)}
- current_ndi (-DI) = ${state.current_ndi.toFixed(3)}

**Perpetual Futures Metrics:**
- Open Interest: Latest: ${state.open_interest.latest.toFixed(2)} | Average: ${state.open_interest.average.toFixed(2)}
- Funding Rate: ${state.funding_rate.toExponential(2)}

**Intraday Series (3-minute intervals, oldest → latest):**

Mid prices: [${state.intraday.mid_prices.map((v) => v.toFixed(2)).join(", ")}]

EMA indicators (20-period): [${state.intraday.ema_20.map((v) => v.toFixed(3)).join(", ")}]

MACD indicators: [${state.intraday.macd.map((v) => v.toFixed(3)).join(", ")}]

RSI indicators (7-Period): [${state.intraday.rsi_7.map((v) => v.toFixed(3)).join(", ")}]

RSI indicators (14-Period): [${state.intraday.rsi_14.map((v) => v.toFixed(3)).join(", ")}]

ADX indicators: [${state.intraday.adx.map((v) => v.toFixed(3)).join(", ")}]

+DI indicators: [${state.intraday.pdi.map((v) => v.toFixed(3)).join(", ")}]

-DI indicators: [${state.intraday.ndi.map((v) => v.toFixed(3)).join(", ")}]

**Longer-term Context (4-hour timeframe):**

20-Period EMA: ${state.longer_term.ema_20.toFixed(3)} vs. 50-Period EMA: ${state.longer_term.ema_50.toFixed(3)}

3-Period ATR: ${state.longer_term.atr_3.toFixed(3)} vs. 14-Period ATR: ${state.longer_term.atr_14.toFixed(3)}

Current Volume: ${state.longer_term.current_volume.toFixed(3)} vs. Average Volume: ${state.longer_term.average_volume.toFixed(3)}

MACD indicators (4h): [${state.longer_term.macd.map((v) => v.toFixed(3)).join(", ")}]

RSI indicators (14-Period, 4h): [${state.longer_term.rsi_14.map((v) => v.toFixed(3)).join(", ")}]
`.trim();
}

/**
 * Format market state as a human-readable string (legacy format)
 */
export function formatMarketState(state: MarketState): string {
  return `
Current Market State:
current_price = ${
    state.current_price
  }, current_ema20 = ${state.current_ema20.toFixed(
    3
  )}, current_macd = ${state.current_macd.toFixed(
    3
  )}, current_rsi (7 period) = ${state.current_rsi.toFixed(3)}

In addition, here is the latest BTC open interest and funding rate for perps:

Open Interest: Latest: ${state.open_interest.latest.toFixed(
    2
  )} Average: ${state.open_interest.average.toFixed(2)}

Funding Rate: ${state.funding_rate.toExponential(2)}

Intraday series (by 3-minute intervals, oldest → latest):

Mid prices: [${state.intraday.mid_prices.map((v) => v.toFixed(1)).join(", ")}]

EMA indicators (20‑period): [${state.intraday.ema_20
    .map((v) => v.toFixed(3))
    .join(", ")}]

MACD indicators: [${state.intraday.macd.map((v) => v.toFixed(3)).join(", ")}]

RSI indicators (7‑Period): [${state.intraday.rsi_7
    .map((v) => v.toFixed(3))
    .join(", ")}]

RSI indicators (14‑Period): [${state.intraday.rsi_14
    .map((v) => v.toFixed(3))
    .join(", ")}]

Longer‑term context (4‑hour timeframe):

20‑Period EMA: ${state.longer_term.ema_20.toFixed(
    3
  )} vs. 50‑Period EMA: ${state.longer_term.ema_50.toFixed(3)}

3‑Period ATR: ${state.longer_term.atr_3.toFixed(
    3
  )} vs. 14‑Period ATR: ${state.longer_term.atr_14.toFixed(3)}

Current Volume: ${state.longer_term.current_volume.toFixed(
    3
  )} vs. Average Volume: ${state.longer_term.average_volume.toFixed(3)}

MACD indicators: [${state.longer_term.macd.map((v) => v.toFixed(3)).join(", ")}]

RSI indicators (14‑Period): [${state.longer_term.rsi_14
    .map((v) => v.toFixed(3))
    .join(", ")}]
`.trim();
}
