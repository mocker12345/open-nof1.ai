完整 User Prompt 重构
It has been {minutes_elapsed} minutes since you started trading.

Below, we are providing you with a variety of state data, price data, and predictive signals so you can discover alpha. Below that is your current account information, value, performance, positions, etc.

⚠️ **CRITICAL: ALL OF THE PRICE OR SIGNAL DATA BELOW IS ORDERED: OLDEST → NEWEST**

**Timeframes note:** Unless stated otherwise in a section title, intraday series are provided at **3-minute intervals**. If a coin uses a different interval, it is explicitly stated in that coin's section.

---

## CURRENT MARKET STATE FOR ALL COINS

### ALL BTC DATA

**Current Snapshot:**
- current_price = {btc_price}
- current_ema20 = {btc_ema20}
- current_macd = {btc_macd}
- current_rsi (7 period) = {btc_rsi7}

**Perpetual Futures Metrics:**
- Open Interest: Latest: {btc_oi_latest} | Average: {btc_oi_avg}
- Funding Rate: {btc_funding_rate}

**Intraday Series (3-minute intervals, oldest → latest):**

Mid prices: [{btc_prices_3m}]

EMA indicators (20-period): [{btc_ema20_3m}]

MACD indicators: [{btc_macd_3m}]

RSI indicators (7-Period): [{btc_rsi7_3m}]

RSI indicators (14-Period): [{btc_rsi14_3m}]

**Longer-term Context (4-hour timeframe):**

20-Period EMA: {btc_ema20_4h} vs. 50-Period EMA: {btc_ema50_4h}

3-Period ATR: {btc_atr3_4h} vs. 14-Period ATR: {btc_atr14_4h}

Current Volume: {btc_volume_current} vs. Average Volume: {btc_volume_avg}

MACD indicators (4h): [{btc_macd_4h}]

RSI indicators (14-Period, 4h): [{btc_rsi14_4h}]

---

### ALL ETH DATA

**Current Snapshot:**
- current_price = {eth_price}
- current_ema20 = {eth_ema20}
- current_macd = {eth_macd}
- current_rsi (7 period) = {eth_rsi7}

**Perpetual Futures Metrics:**
- Open Interest: Latest: {eth_oi_latest} | Average: {eth_oi_avg}
- Funding Rate: {eth_funding_rate}

**Intraday Series (3-minute intervals, oldest → latest):**

Mid prices: [{eth_prices_3m}]

EMA indicators (20-period): [{eth_ema20_3m}]

MACD indicators: [{eth_macd_3m}]

RSI indicators (7-Period): [{eth_rsi7_3m}]

RSI indicators (14-Period): [{eth_rsi14_3m}]

**Longer-term Context (4-hour timeframe):**

20-Period EMA: {eth_ema20_4h} vs. 50-Period EMA: {eth_ema50_4h}

3-Period ATR: {eth_atr3_4h} vs. 14-Period ATR: {eth_atr14_4h}

Current Volume: {eth_volume_current} vs. Average Volume: {eth_volume_avg}

MACD indicators (4h): [{eth_macd_4h}]

RSI indicators (14-Period, 4h): [{eth_rsi14_4h}]

---

### ALL SOL DATA

[Same structure as BTC/ETH...]

---

### ALL BNB DATA

[Same structure as BTC/ETH...]

---

### ALL DOGE DATA

[Same structure as BTC/ETH...]

---

### ALL XRP DATA

[Same structure as BTC/ETH...]

---

## HERE IS YOUR ACCOUNT INFORMATION & PERFORMANCE

**Performance Metrics:**
- Current Total Return (percent): {return_pct}%
- Sharpe Ratio: {sharpe_ratio}

**Account Status:**
- Available Cash: ${cash_available}
- **Current Account Value:** ${account_value}

**Current Live Positions & Performance:**

```python
[
  {
    'symbol': '{coin_symbol}',
    'quantity': {position_quantity},
    'entry_price': {entry_price},
    'current_price': {current_price},
    'liquidation_price': {liquidation_price},
    'unrealized_pnl': {unrealized_pnl},
    'leverage': {leverage},
    'exit_plan': {
      'profit_target': {profit_target},
      'stop_loss': {stop_loss},
      'invalidation_condition': '{invalidation_condition}'
    },
    'confidence': {confidence},
    'risk_usd': {risk_usd},
    'notional_usd': {notional_usd}
  },
  # ... additional positions if any
]
```

If no open positions:
```python
[]
```

Based on the above data, provide your trading decision in the required JSON format.