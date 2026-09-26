#!/bin/bash
set -e

echo "Running security checks..."

# Check .env is not staged
if git diff --cached --name-only | grep -E '^\.env$|^\.env\.' | grep -v '\.example$'; then
  echo "ERROR: .env file is staged for commit!"
  exit 1
fi

# Check for common secret patterns in staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
if [ -n "$STAGED_FILES" ]; then
  if echo "$STAGED_FILES" | xargs grep -l -E '(password|secret|api_key|apikey|token)\s*[:=]\s*["\047][^"\047]{8,}["\047]' 2>/dev/null; then
    echo "WARNING: Possible secrets found in staged files - please verify"
  fi
fi

# Check for SQLite DB being committed
if git diff --cached --name-only | grep -E '\.db$'; then
  echo "ERROR: SQLite database file is staged for commit!"
  exit 1
fi

# Dependency audit (frontend)
if [ -f "frontend/package.json" ]; then
  echo "Checking npm dependencies..."
  cd frontend && npm audit --audit-level=high 2>/dev/null || echo "Warning: npm audit found issues"
  cd ..
fi

# Python dependency check
if [ -f "backend/requirements.txt" ]; then
  if command -v safety &> /dev/null; then
    echo "Checking Python dependencies..."
    safety check -r backend/requirements.txt 2>/dev/null || echo "Warning: safety found issues"
  fi
fi

echo "Security checks complete!"
