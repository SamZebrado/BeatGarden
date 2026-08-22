# BeatGarden agent routing

The primary Sol agent owns product meaning, architecture, cross-system integration,
save compatibility, final diff review, runtime acceptance, and release conclusions.

Use the `dirty_worker` role only for explicit, mechanical, low-context work and only
after runtime metadata proves that the effective model is
`gpt-5.3-codex-spark`. A role name or configuration string is not proof. If Spark
cannot be selected or verified, record the failure once and fall back cleanly.

Use native GPT-5.6 Terra for bounded implementation that needs meaningful code
comprehension. Do not send Terra-sized work to Spark merely because Spark has separate
capacity. Keep ambiguous, architectural, semantic, migration, integration, and final
acceptance work in Sol.

Decision rule:

- mechanical / explicit / low-context -> verified Spark `dirty_worker`;
- bounded implementation / moderate comprehension -> Terra;
- ambiguous / architectural / semantic / acceptance -> Sol.

Delegation depth is one. No worker may spawn another worker. The parent must give an
exact file scope, forbidden scope where relevant, acceptance criteria, and validation
commands. The parent must inspect every retained worker diff and independently rerun or
spot-check critical validation. Do not delegate tiny tasks when orchestration costs more
than direct work, and do not turn unavailable Spark routing into a debugging project.
