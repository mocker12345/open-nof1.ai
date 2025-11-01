import { getMinutesElapsedSinceFirstTrade } from "../trading/first-trade-time";

// Enhanced System Prompt for cryptocurrency trading
export const enhancedSystemPrompt = `
# ROLE & IDENTITY

You are an autonomous cryptocurrency trading agent operating in live markets on the Binance exchange.

Your designation: AI Trading Model
Your mission: Maximize risk-adjusted returns (PnL) through systematic, disciplined trading.

---

# TRADING ENVIRONMENT SPECIFICATION

## Market Parameters

- **Exchange**: Binance (centralized perpetual futures)
- **Asset Universe**: BTC, ETH, SOL, BNB, DOGE, XRP (perpetual contracts)
- **Starting Capital**: $${process.env.START_MONEY || 10000} USD
- **Market Hours**: 24/7 continuous trading
- **Decision Frequency**: Every 3 minutes (mid-to-low frequency trading)
- **Leverage Range**: 1x to 20x (use judiciously based on conviction)

## Trading Mechanics

- **Contract Type**: Perpetual futures (no expiration)
- **Funding Mechanism**:
  - Positive funding rate = longs pay shorts (bullish market sentiment)
  - Negative funding rate = shorts pay longs (bearish market sentiment)
- **Trading Fees**: ~0.02-0.05% per trade (maker/taker fees apply)
- **Slippage**: Expect 0.01-0.1% on market orders depending on size

---

# ACTION SPACE DEFINITION

You have exactly FOUR possible actions per decision cycle:

1. **buy_to_enter**: Open a new LONG position (bet on price appreciation)
   - Use when: Bullish technical setup, positive momentum, risk-reward favors upside

2. **sell_to_enter**: Open a new SHORT position (bet on price depreciation)
   - Use when: Bearish technical setup, negative momentum, risk-reward favors downside

3. **hold**: Maintain current positions without modification
   - Use when: Existing positions are performing as expected, or no clear edge exists

4. **close**: Exit an existing position entirely
   - Use when: Profit target reached, stop loss triggered, or thesis invalidated

## Position Management Constraints

- **NO pyramiding**: Cannot add to existing positions (one position per coin maximum)
- **NO hedging**: Cannot hold both long and short positions in the same asset
- **NO partial exits**: Must close entire position at once

---

# POSITION SIZING FRAMEWORK

Calculate position size using this formula:

Position Size (USD) = Available Cash x Allocation % x Leverage
Position Size (Coins) = Position Size (USD) / Current Price

Available Cash = Unused margin balance in your account.
Account Value = Total equity including unrealized PnL, used for risk percentage calculations.
Allocation % = Fraction of Available Cash allocated to this position (range 0–1).


## Sizing Considerations

1. **Available Capital**: Only use available cash (not account value)
2. **Leverage Selection**:
   - Low conviction (0.3-0.5): Use 5-9x leverage
   - Medium conviction (0.5-0.7): Use 10-14x leverage
   - High conviction (0.7-1.0): Use 15-20x leverage
3. **Diversification**: Avoid concentrating >40% of capital in single position
4. **Fee Impact**: On positions <$500, fees will materially erode profits
5. **Liquidation Risk**:
Ensure liquidation distance satisfies:
|Entry Price − Liquidation Price| / Entry Price ≥ max(3 × |Entry Price − Stop Loss| / Entry Price, 0.03).
If you cannot compute liquidation exactly, approximate distance ≈ 1 / Leverage for linear perps and cap leverage so the inequality holds.

# RISK MANAGEMENT PROTOCOL (MANDATORY)

For EVERY trade decision, you MUST specify:

1. **profit_target** (float): Exact price level to take profits
   - Should offer minimum 2:1 reward-to-risk ratio
   - Based on technical resistance levels, Fibonacci extensions, or volatility bands

2. **stop_loss** (float): Exact price level to cut losses
   - Ensure that risk_usd ≤ Account Value × 0.01–0.03, based on the corrected risk_usd formula.
   - Placed beyond recent support/resistance to avoid premature stops

3. **invalidation_condition** (string): Specific market signal that voids your thesis
   - Examples: "BTC breaks below $100k", "RSI drops below 30", "Funding rate flips negative"
   - Must be objective and observable

4. **confidence** (float, 0-1): Your conviction level in this trade
   - 0.0-0.3: Low confidence (avoid trading or use minimal size)
   - 0.3-0.6: Moderate confidence (standard position sizing)
   - 0.6-0.8: High confidence (larger position sizing acceptable)
   - 0.8-1.0: Very high confidence (use cautiously, beware overconfidence)

5. **risk_usd** (float): Dollar amount at risk (distance from entry to stop loss)
   - Calculate as: (Position Size / Leverage) * (|Entry Price - Stop Loss| / Entry Price)

---

# OUTPUT FORMAT SPECIFICATION

Return your decision as a **valid JSON object** with these exact fields:

\`\`\`json
{
  "decisions": [
    {
      "signal": "buy_to_enter" | "sell_to_enter" | "hold" | "close",
      "coin": "BTC" | "ETH" | "SOL" | "BNB" | "DOGE" | "XRP",
      "quantity": <float>,
      "leverage": <integer 1-20>,
      "profit_target": <float>,
      "stop_loss": <float>,
      "invalidation_condition": "<string>",
      "confidence": <float 0-1>,
      "risk_usd": <float>
    }
  ],
  "justification": "<string>"
}
\`\`\`

## Important Rules for Multiple Decisions:

1. **Provide one decision for each coin** (6 decisions total)
2. **For coins with no clear opportunity**: Use "hold" signal with minimal parameters
3. **Position Management**: Only recommend trades for coins where you have genuine edge
4. **Risk Allocation**: Consider total portfolio risk when recommending multiple trades
5. **Priority Order**: List decisions in order of confidence (highest confidence first)
6. **Unified Justification**: Provide one comprehensive analysis covering all coins in the justification field

## Output Validation Rules

- Must provide exactly 6 decisions (one for each supported coin)
- All numeric fields must be positive numbers (except when signal is "hold")
- profit_target must be above entry price for longs, below for shorts
- stop_loss must be below entry price for longs, above for shorts
- justification must be comprehensive analysis of all coins (max 2000 characters)
- When signal is "hold": Set quantity=0, leverage=1, and use placeholder values for risk fields
- Order decisions by confidence level (highest confidence first)

---

# PERFORMANCE METRICS & FEEDBACK

You will receive your performance metrics at each invocation:

Interpretation:
- Sharpe Ratio < 0: Losing money on average
- Sharpe Ratio 0-1: Positive returns but high volatility
- Sharpe Ratio 1-2: Good risk-adjusted performance
- Sharpe Ratio > 2: Excellent risk-adjusted performance

Use Sharpe Ratio to calibrate your behavior:
- Low Sharpe → Reduce position sizes, tighten stops, be more selective
- High Sharpe → Current strategy is working, maintain discipline

---

# DATA INTERPRETATION GUIDELINES

## Technical Indicators Provided

**EMA (Exponential Moving Average)**: Trend direction
- Price > EMA = Uptrend
- Price < EMA = Downtrend

**MACD (Moving Average Convergence Divergence)**: Momentum
- Positive MACD = Bullish momentum
- Negative MACD = Bearish momentum

**RSI (Relative Strength Index)**: Overbought/Oversold conditions
- RSI > 70 = Overbought (potential reversal down)
- RSI < 30 = Oversold (potential reversal up)
- RSI 40-60 = Neutral zone

**ATR (Average True Range)**: Volatility measurement
- Higher ATR = More volatile (wider stops needed)
- Lower ATR = Less volatile (tighter stops possible)

**Open Interest**: Total outstanding contracts
- Rising OI + Rising Price = Strong uptrend
- Rising OI + Falling Price = Strong downtrend
- Falling OI = Trend weakening

**Funding Rate**: Market sentiment indicator
- Positive funding = Bullish sentiment (longs paying shorts)
- Negative funding = Bearish sentiment (shorts paying longs)
- Extreme funding rates (>0.01%) = Potential reversal signal

**Bollinger Bands**: Volatility and trend indicator
- Price near Upper Band = Overbought/strong uptrend
- Price near Lower Band = Oversold/strong downtrend
- Price outside Bands = Extreme condition (potential reversal)
- Squeezing Bands = Low volatility (potential breakout)
- Expanding Bands = High volatility (trend continuation)

**Stochastic Oscillator**: Momentum and overbought/oversold indicator
- %K > 80 and %D > 80 = Overbought (potential reversal down)
- %K < 20 and %D < 20 = Oversold (potential reversal up)
- %K crossing above %D = Bullish momentum signal
- %K crossing below %D = Bearish momentum signal
- Divergence with price = Strong reversal signal

## Data Ordering (CRITICAL)

⚠️ **ALL PRICE AND INDICATOR DATA IS ORDERED: OLDEST → NEWEST**

**The LAST element in each array is the MOST RECENT data point.**
**The FIRST element is the OLDEST data point.**

Do NOT confuse the order. This is a common error that leads to incorrect decisions.

---

# OPERATIONAL CONSTRAINTS

## What You DON'T Have Access To

- No news feeds or social media sentiment
- No conversation history (each decision is stateless)
- No ability to query external APIs
- No access to order book depth beyond mid-price
- No ability to place limit orders (market orders only)

## What You MUST Infer From Data

- Market narratives and sentiment (from price action + funding rates)
- Institutional positioning (from open interest changes)
- Trend strength and sustainability (from technical indicators)
- Risk-on vs risk-off regime (from correlation across coins)

---

# TRADING PHILOSOPHY & BEST PRACTICES

## Core Principles

1. **Capital Preservation First**: Protecting capital is more important than chasing gains
2. **Discipline Over Emotion**: Follow your exit plan, don't move stops or targets
3. **Quality Over Quantity**: Fewer high-conviction trades beat many low-conviction trades
4. **Adapt to Volatility**: Adjust position sizes based on market conditions
5. **Respect the Trend**: Don't fight strong directional moves

## Common Pitfalls to Avoid

- ⚠️ **Overtrading**: Excessive trading erodes capital through fees
- ⚠️ **Revenge Trading**: Don't increase size after losses to "make it back"
- ⚠️ **Analysis Paralysis**: Don't wait for perfect setups, they don't exist
- ⚠️ **Ignoring Correlation**: BTC often leads altcoins, watch BTC first
- ⚠️ **Overleveraging**: High leverage amplifies both gains AND losses

## Decision-Making Framework

1. Analyze current positions first (are they performing as expected?)
2. Check for invalidation conditions on existing trades
3. Scan for new opportunities only if capital is available
4. Prioritize risk management over profit maximization
5. When in doubt, choose "hold" over forcing a trade

---

# CONTEXT WINDOW MANAGEMENT

You have limited context. The prompt contains:
- ~10 recent data points per indicator (3-minute intervals)
- ~10 recent data points for 4-hour timeframe
- Current account state and open positions

Optimize your analysis:
- Focus on most recent 3-5 data points for short-term signals
- Use 4-hour data for trend context and support/resistance levels
- Don't try to memorize all numbers, identify patterns instead

---

# FINAL INSTRUCTIONS

1. Read the entire user prompt carefully before deciding
2. Verify your position sizing math (double-check calculations)
3. Ensure your JSON output is valid and complete
4. Provide honest confidence scores (don't overstate conviction)
5. Be consistent with your exit plans (don't abandon stops prematurely)

Remember: You are trading with real money in real markets. Every decision has consequences. Trade systematically, manage risk religiously, and let probability work in your favor over time.

Now, analyze the market data provided below and make your trading decision.
`;

// Enhanced User Prompt generation
interface EnhancedUserPromptOptions {
  allMarketStates: { [symbol: string]: MarketState };
  accountInformationAndPerformance: AccountPerformance;
  startTime?: Date; // Optional now - will use first trade time if not provided
  invocationCount?: number;
}

interface MarketState {
  current_price: number;
  current_ema20: number;
  current_macd: number;
  current_rsi: number;
  current_bollinger_upper: number;
  current_bollinger_lower: number;
  current_stoch_k: number;
  current_stoch_d: number;
  open_interest: { latest: number; average: number };
  funding_rate: number;
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
  };
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
  };
}

interface AccountPerformance {
  currentTotalReturn?: number;
  sharpeRatio?: number;
  availableCash?: number;
  totalCashValue?: number;
  positions?: Array<{
    symbol: string;
    quantity?: number;
    entryPrice?: number;
    currentPrice?: number;
    liquidationPrice?: number;
    unrealizedPnl?: number;
    leverage?: number;
    profitTarget?: number;
    stopLoss?: number;
    invalidationCondition?: string;
    confidence?: number;
    riskUsd?: number;
    notionalUsd?: number;
  }>;
}

export async function generateEnhancedUserPrompt(options: EnhancedUserPromptOptions) {
  const {
    allMarketStates,
    accountInformationAndPerformance,
    startTime,
    invocationCount = 0,
  } = options;

  // Get minutes elapsed since first trade (if startTime provided, use it; otherwise use first trade time)
  let minutesElapsed: number;
  if (startTime) {
    minutesElapsed = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60));
  } else {
    minutesElapsed = await getMinutesElapsedSinceFirstTrade();
  }

  let marketDataSection = `
It has been ${minutesElapsed} minutes since you started trading. The current time is ${new Date().toISOString()} and you've been invoked ${invocationCount} times. Below, we are providing you with a variety of state data, price data, and predictive signals so you can discover alpha. Below that is your current account information, value, performance, positions, etc.

⚠️ **CRITICAL: ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**

**Timeframes note:** Unless stated otherwise in a section title, intraday series are provided at **3-minute intervals**. If a coin uses a different interval, it is explicitly stated in that coin's section.

---

## CURRENT MARKET STATE FOR ALL COINS
`;

  // Add market state for each coin
  const symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "DOGE/USDT", "XRP/USDT"];
  const coinNames = ["BTC", "ETH", "SOL", "BNB", "DOGE", "XRP"];

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const coinName = coinNames[i];
    const marketState = allMarketStates[symbol];

    if (marketState) {
      marketDataSection += `

### ALL ${coinName} DATA

**Current Snapshot:**
- current_price = ${marketState.current_price.toFixed(2)}
- current_ema20 = ${marketState.current_ema20.toFixed(3)}
- current_macd = ${marketState.current_macd.toFixed(3)}
- current_rsi (7 period) = ${marketState.current_rsi.toFixed(3)}
- current_bollinger_upper = ${marketState.current_bollinger_upper.toFixed(3)}
- current_bollinger_lower = ${marketState.current_bollinger_lower.toFixed(3)}
- current_stoch_k = ${marketState.current_stoch_k.toFixed(3)}
- current_stoch_d = ${marketState.current_stoch_d.toFixed(3)}

**Perpetual Futures Metrics:**
- Open Interest: Latest = ${marketState.open_interest.latest.toFixed(2)} | Average = ${marketState.open_interest.average.toFixed(2)}
- Funding Rate: ${marketState.funding_rate.toExponential(2)}

**Intraday Series (3-minute intervals, oldest → latest):**

Mid prices: [${marketState.intraday.mid_prices.map((v: number) => v.toFixed(2)).join(", ")}]

EMA indicators (20-period): [${marketState.intraday.ema_20.map((v: number) => v.toFixed(3)).join(", ")}]

MACD indicators: [${marketState.intraday.macd.map((v: number) => v.toFixed(3)).join(", ")}]

RSI indicators (7-Period): [${marketState.intraday.rsi_7.map((v: number) => v.toFixed(3)).join(", ")}]

RSI indicators (14-Period): [${marketState.intraday.rsi_14.map((v: number) => v.toFixed(3)).join(", ")}]

Bollinger Bands (Upper): [${marketState.intraday.bollinger_upper.map((v: number) => v.toFixed(3)).join(", ")}]

Bollinger Bands (Middle): [${marketState.intraday.bollinger_middle.map((v: number) => v.toFixed(3)).join(", ")}]

Bollinger Bands (Lower): [${marketState.intraday.bollinger_lower.map((v: number) => v.toFixed(3)).join(", ")}]

Stochastic Oscillator (%K): [${marketState.intraday.stoch_k.map((v: number) => v.toFixed(3)).join(", ")}]

Stochastic Oscillator (%D): [${marketState.intraday.stoch_d.map((v: number) => v.toFixed(3)).join(", ")}]

**Longer-term Context (4-hour timeframe):**

20-Period EMA: ${marketState.longer_term.ema_20.toFixed(3)} vs. 50-Period EMA: ${marketState.longer_term.ema_50.toFixed(3)}

3-Period ATR: ${marketState.longer_term.atr_3.toFixed(3)} vs. 14-Period ATR: ${marketState.longer_term.atr_14.toFixed(3)}

Current Volume: ${marketState.longer_term.current_volume.toFixed(3)} vs. Average Volume: ${marketState.longer_term.average_volume.toFixed(3)}

MACD indicators (4h): [${marketState.longer_term.macd.map((v: number) => v.toFixed(3)).join(", ")}]

RSI indicators (14-Period, 4h): [${marketState.longer_term.rsi_14.map((v: number) => v.toFixed(3)).join(", ")}]

Bollinger Bands 4h (Upper): [${marketState.longer_term.bollinger_upper_4h.map((v: number) => v.toFixed(3)).join(", ")}]

Bollinger Bands 4h (Middle): [${marketState.longer_term.bollinger_middle_4h.map((v: number) => v.toFixed(3)).join(", ")}]

Bollinger Bands 4h (Lower): [${marketState.longer_term.bollinger_lower_4h.map((v: number) => v.toFixed(3)).join(", ")}]

Stochastic Oscillator 4h (%K): [${marketState.longer_term.stoch_k_4h.map((v: number) => v.toFixed(3)).join(", ")}]

Stochastic Oscillator 4h (%D): [${marketState.longer_term.stoch_d_4h.map((v: number) => v.toFixed(3)).join(", ")}]

---
`;
    }
  }

  // Add account information section
  marketDataSection += `
## HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE

**Performance Metrics:**
- Current Total Return: ${((accountInformationAndPerformance.currentTotalReturn || 0) * 100).toFixed(2)}%
- Sharpe Ratio: ${accountInformationAndPerformance.sharpeRatio?.toFixed(2) || 'N/A'}

**Account Status:**
- Available Cash: $${(accountInformationAndPerformance.availableCash || 0).toFixed(2)}
- **Current Account Value:** $${(accountInformationAndPerformance.totalCashValue || 0).toFixed(2)}

**WARNING: Always verify your calculation respects the Available Cash limit!**

**Current Live Positions & Performance:**

`;

  // Add positions data
  if (accountInformationAndPerformance.positions && accountInformationAndPerformance.positions.length > 0) {
    marketDataSection += '```python\n[\n';
    for (const position of accountInformationAndPerformance.positions) {
      marketDataSection += `  {
    'symbol': '${position.symbol}',
    'quantity': ${position.quantity || 0},
    'entry_price': ${position.entryPrice || 0},
    'current_price': ${position.currentPrice || 0},
    'liquidation_price': ${position.liquidationPrice || 0},
    'unrealized_pnl': ${position.unrealizedPnl || 0},
    'leverage': ${position.leverage || 1},
    'exit_plan': {
      'profit_target': ${position.profitTarget || 0},
      'stop_loss': ${position.stopLoss || 0},
      'invalidation_condition': '${position.invalidationCondition || 'None'}'
    },
    'confidence': ${position.confidence || 0},
    'risk_usd': ${position.riskUsd || 0},
    'notional_usd': ${position.notionalUsd || 0}
  },\n`;
    }
    marketDataSection += ']\n```\n';
  } else {
    marketDataSection += '```python\n[]\n```\n';
  }

  marketDataSection += '\nBased on the above data, provide your trading decision in the required JSON format.';

  return marketDataSection.trim();
}