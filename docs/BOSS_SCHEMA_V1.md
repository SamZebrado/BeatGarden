# BeatGarden Boss Schema v1

Boss files are local data, never scripts. BeatGarden parses JSON, rejects unknown fields,
validates every enum/range, previews the result, and requires explicit confirmation before
saving it under `beatgarden.running.v2`. It never evaluates JavaScript, expressions, URLs,
plugins, or modules. Imports and exports stay on the device.

Every pasted/file import is normalized to `origin: "custom"` when the player confirms
the preview. `builtin` is reserved for shipped profiles and `promoted-player` is reserved
for the explicit post-completion promotion action.

Required root fields are `schema`, `id`, `name`, `origin`, `worlds`, `appearance`, `stats`,
`traits`, `behavior`, `weaknesses`, `resistances`, and `reward`. The schema identifier is
`beatgarden-boss.v1`. See [supportive-mentor.boss.json](examples/supportive-mentor.boss.json)
for a complete example and the TypeScript validator for authoritative ranges.

Allowed attack patterns are `radial-pulse`, `directed-burst`, `orbiting-pressure`,
`lane-sweep`, and `interrupt-ring`. Allowed weakness/resistance tags are `focus`,
`evidence`, `clarity`, `boundary`, `connection`, and `mobility`. There is deliberately no
general scripting language.

## Copyable external-AI prompt

> Convert the following fictional/composite person description into
> `beatgarden-boss.v1`. Return JSON data only. Use only the documented bounded fields
> and predefined attacks; do not include code, URLs, scripts, plugins, real-person
> allegations, or extra keys. Validate the result against this document before import.

Completing a world does not automatically create a Boss. The terminal screen offers an
explicit **Save this version of me as a Boss** action. Only when the player selects it does
BeatGarden map that final snapshot through the same schema with
`origin: "promoted-player"`. The bounded mapping uses world, completion count, difficulty,
orbit count, Energy, Focus, Spirit, and the applicable evidence/connection/priority fields.
Different final snapshots can therefore produce different valid Bosses; raw save state
never becomes executable behavior.
