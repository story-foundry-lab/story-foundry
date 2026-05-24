---
name: fiction-idea-tournament
description: Use when fiction work asks for multi-agent idea generation, writer room, idea tournament, Gemini-style ideation, many variants, subagents, scoring, or parallel creative review.
---

# Fiction Idea Tournament

## Core Rule

This skill extends, and never replaces, `.agents/skills/novel-fiction/SKILL.md`.

Before running a tournament, read the target work `README.md`, `ka.yaml`, `agent_surface.state`, the relevant outline/canon/style files, and the novel-fiction hard rules. Do not let tournament output override canon, user corrections, POV constraints, natural-language constraints, or public-repo hygiene.

## When To Use

Use for high-variance creative decisions:

- outline options
- scene design
- emotional beat design
- crisis mechanism options
- character-choice alternatives
- trope/terminology pruning
- "is this setting useful" style decisions

Do not use for normal sentence polishing, small continuity checks, or final prose by committee. For prose, use the tournament to choose a direction, then write one unified draft through the novel-fiction editing/TDD workflow.

## Default Room

Use 12 roles total.

### 8 idea scouts

Each scout produces one compact candidate, not a full chapter.

1. **Emotion scout**: finds the strongest emotional turn.
2. **Plot scout**: finds the cleanest causal mechanism.
3. **Character scout**: protects agency and motivation.
4. **World scout**: ties the idea to existing canon.
5. **Ordinary-life scout**: grounds the idea in daily objects, work, food, routes, illness, letters, rituals, or chores.
6. **Conflict scout**: sharpens pressure and opposition.
7. **Theme scout**: checks the story's main proposition.
8. **Simplifier scout**: removes redundant terms, mechanics, or "cool but useless" setup.

### 3 reviewers

Reviewers do not add new ideas unless asked for a fix.

1. **Canon reviewer**: rejects contradictions, unsupported facts, and stolen authority from formal sources.
2. **Protagonist reviewer**: protects the intended protagonist/observer role and prevents side characters from becoming accidental saviors.
3. **Language reviewer**: rejects jargon, artificial Chinese, over-named roles, slogans, and abstract theme talk.

### 1 editor

The editor integrates usable parts from the top candidates. The editor must not pick a whole winner by vote if a hybrid is stronger.

## Runbook

1. **Write the brief**: goal, work id, source files read, non-negotiables, forbidden moves, output length, and success criteria.
2. **Generate candidates**: ask 8 scouts for separate answers. Each answer must include `idea`, `why it works`, `risk`, and `what to discard`.
3. **Apply hard gates**: reviewers reject any candidate that breaks canon, user corrections, protagonist focus, ordinary-person scale, or language naturalness.
4. **Score survivors**: use the rubric below, or a user-provided rubric.
5. **Integrate**: take useful pieces from the best 2-3 candidates. Do not average them. State what is kept and what is thrown away.
6. **Return a decision**: present the integrated recommendation and 1-2 alternatives. Ask for approval before editing files unless the user already asked to implement.
7. **Edit through novel-fiction**: if writing or modifying files, continue with novel-fiction TDD and verification.

## Hard Gates

Reject a candidate if it:

- contradicts formal canon, outline, character cards, or the user's latest correction
- makes the wrong character the long-term protagonist
- turns a witness/traveler into a savior or institution builder
- makes ordinary people too grand, strategic, or symbolic too early
- adds a named mechanism, office, class, artifact, or term without clear payoff
- explains a mystery earlier than the outline allows
- turns emotional design into a slogan
- sounds like translated English, overbuilt fantasy taxonomy, or a setting encyclopedia

## Scoring Rubric

After hard gates, score 0-5 for each dimension:

| Dimension | Weight |
|---|---:|
| Fits protagonist/observer role | 20 |
| Emotional force and restraint | 20 |
| Ordinary-person scale | 15 |
| Canon and causal fit | 15 |
| Terminology economy | 10 |
| Scene writability | 10 |
| Freshness | 5 |
| Keeps future options open | 5 |

## Prompt Templates

### Scout

```text
You are the {role} for a fiction idea tournament.
Task: {goal}
Sources read: {source_list}
Non-negotiables: {constraints}
Forbidden moves: {forbidden}
Return one candidate in this shape:
- idea:
- why it works:
- risk:
- what to discard:
Keep it under {limit}.
Do not write final prose.
```

### Reviewer

```text
You are the {reviewer_role}.
Evaluate these candidates against the hard gates and rubric.
Return:
- rejected candidates with exact reason
- surviving scores
- strongest usable fragments
- biggest risk if we implement the current top option
Do not add new lore unless a minimal repair is required.
```

### Editor

```text
Integrate the surviving candidates.
Do not select a whole winner if a hybrid is stronger.
Return:
- recommended direction
- kept fragments
- discarded fragments
- remaining risks
- exact next edit target, if any
Keep the result aligned with novel-fiction constraints.
```

## Output Shape

Default final answer:

1. **Recommendation**: one integrated direction.
2. **Why this one**: 2-4 concise reasons.
3. **Discarded options**: only the important rejects.
4. **Next edit target**: file/section if implementation is requested.

Do not dump all 12 raw outputs unless the user asks.

## Common Mistakes

- **Mistake**: 12 agents each write a full scene.
  **Fix**: scouts generate compact directions; one editor writes the final direction.
- **Mistake**: top score becomes final answer unchanged.
  **Fix**: extract useful fragments; discard weak parts.
- **Mistake**: reviewers reward ornate prose.
  **Fix**: reviewers score fit, emotion, causality, and terminology economy before style.
- **Mistake**: tournament invents new settings to solve a local issue.
  **Fix**: Simplifier and Canon reviewers reject unearned new machinery.
- **Mistake**: outputs over-credit a side character.
  **Fix**: Protagonist reviewer checks the intended observer/protagonist role.
