# Makefile - Spec-Kit developer workflow

.PHONY: spec-index spec-validate spec-report spec-gap pre-commit-install

spec-index:
	.venv/bin/python scripts/spec_index.py

spec-validate:
	.venv/bin/python scripts/spec_validate.py --report

spec-report:
	.venv/bin/python scripts/spec_validate.py --report

spec-gap:
	.venv/bin/python scripts/spec_validate.py --gap

pre-commit-install:
	uv pip install pre-commit --system || true
	uv run pre-commit install --hook-type pre-commit --hook-type commit-msg

