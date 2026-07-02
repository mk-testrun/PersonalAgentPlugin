---
name: python-conventions
description: >-
  Nutze proaktiv beim Schreiben von Python-Code: uv statt pip direkt, ruff als Formatter/Linter, mypy --strict
  für Typen und pytest fürs Testen. Regel-/Wissens-Skill — nennt je Verstoß die idiomatische, moderne
  Python-Alternative.
---

## Stack

- **Package-Manager:** uv (nicht pip direkt)
- **Formatter/Linter:** ruff
- **Type-Checking:** mypy --strict
- **Testing:** pytest

## Regeln

1. Type-Hints überall (mypy --strict kompatibel)
2. `uv run pytest` statt `python -m pytest`
3. `ruff format` + `ruff check --fix` vor Commit
4. `pyproject.toml` für alle Projektmetadaten
