# builders.ac kit

The kit lets a customer's agent use already authenticated connections for
onboarding, prospecting, infrastructure, campaigns and fleet review.

## Fleet terms

**Pool role**: Intended use of a domain: primary, catchall or standby. It is
separate from health. A local recommendation is not a deployed sequencer tag.

**Primary pool (A)**: Domains designated for deliverable-lead campaigns.

**Catch-all pool (B)**: Dedicated domains for catch-all campaigns. Domain
separation alone does not establish independent tenants/IPs.

**Standby pool (C)**: Explicitly designated replacement inventory with no active
or draft campaign commitments.

**Ready standby**: A standby whose minimum known warming age, fresh health and
complete availability evidence satisfy the policy. A hypothetical pool is not
ready inventory.

**Recovery**: A health state for poor warmup or sender-health evidence. Return
requires another assessment, not an automatic promise of recovery.

**Configuration review**: A failed or conflicting authentication check that
needs investigation and verification.

**Observed mapping**: Explicit assignments or lane membership derived from
selected campaigns. A domain present in both lanes is reported as mixed.

**Proposed mapping**: A deterministic planning scenario; it neither mutates
campaigns nor authorizes execution.

**Replacement forecast**: Expected source/replacement transitions and capacity
under stated assumptions. It is not a completed swap.

**Refill requirement**: Quantity and provider/lane needed to restore the reserve
under a scenario. It does not place an order.

**Review scope**: The inspected campaigns and domains. Partial scope cannot
prove fleet-wide standby absence or historical membership.
