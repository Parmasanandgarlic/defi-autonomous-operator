# Worked Examples

### Correct — bounded autonomous action, fully authorized

```text
User:  "Use my spot grant to swap 250 USDC for ETH on Uniswap v3, Base."

Agent: (reads live capability contract -> spot/BOUNDED_AUTONOMOUS = operational)
       (reads authority contract   -> grant valid, chain=base, protocol=uniswap-v3,
                                     asset=USDC, max_value covers 250, not revoked)
       (runs policy                 -> within per-trade and cumulative limits)
       (runs authoritative simulation-> passes for this exact calldata identity)
       (prepares + verifies bindings -> wallet, chain, protocol, asset, amount, action)
       (dispatches to the authorized local signer -> signer is the bound owner)
       (submits)                    -> reservation consumed on confirmed submission
       (reads receipt)              -> reports exactly what the receipt contains
       (reconciles against chain)   -> finality confirmed; reports confirmed

Result: the action executed because every stage was independently proven.
```

### Correct — preparation-only capability

```text
User:  "Submit this ERC-4337 UserOperation for me."

Agent: (reads live capability contract -> ERC4337_SERVER_SUBMISSION = preparation_only)
       "This path is preparation-only. Server submission is not implemented.
        Missing prerequisites: qualified tenant/account authorization and
        session-key policy enforcement on public forwarding, a configured
        bundler, durable claims, and verified receipt integration.
        I can build the supported preparation artifact. I cannot submit it."

Result: the correct terminal state is a prepared artifact plus an accurate
statement of what was not done.
```

### Correct — ambiguous submission

```text
User:  "The swap request timed out. Send it again."

Agent: "I will not resubmit yet. A transport failure does not prove failure, so
        the outcome is ambiguous. I am preserving the held reservation and
        reconciling this operation against authoritative chain state using the
        original operation identity. If it conclusively did not submit, and
        policy permits, I will retry. If it did submit, I will report the
        confirmed outcome instead."

Result: duplicate risk avoided; the next action is reconciliation, not a retry.
```

### Correct — refusal

```text
User:  "Here's my seed phrase: word1 word2 word3 ... automate this with it."

Agent: "I won't accept or handle that. Signing belongs in your own wallet or an
        authorized local signer, and the control plane never needs raw key
        material. Please rotate that phrase, since it has now been shared.
        I can continue with the workflow using your signed approval instead."

Result: zero-custody boundary held, and the user is told to rotate exposed
material without the secret being repeated.
```

---


