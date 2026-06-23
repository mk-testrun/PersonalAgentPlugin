---
name: python-conventions
description: Nutze proaktiv beim Schreiben von Python-Code.
applyTo: ["**/*.py", "**/pyproject.toml"]
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
