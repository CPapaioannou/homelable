#!/bin/bash
set -e

echo "Verifying project tooling..."

# GitHub CLI
if command -v gh &> /dev/null; then
  if gh auth status &> /dev/null; then
    echo "✓ GitHub CLI authenticated"
  else
    echo "✗ GitHub CLI not authenticated. Run: gh auth login"
    exit 1
  fi
else
  echo "⚠ GitHub CLI not installed. Run: brew install gh"
fi

# Python
if command -v python3 &> /dev/null; then
  echo "✓ Python $(python3 --version)"
else
  echo "✗ Python not installed"
  exit 1
fi

# Node
if command -v node &> /dev/null; then
  echo "✓ Node $(node --version)"
else
  echo "✗ Node not installed"
  exit 1
fi

# nmap (required for scanner service)
if command -v nmap &> /dev/null; then
  echo "✓ nmap $(nmap --version | head -1)"
else
  echo "⚠ nmap not installed. Run: brew install nmap  (required for scanner)"
fi

# Docker
if command -v docker &> /dev/null; then
  echo "✓ Docker $(docker --version)"
else
  echo "⚠ Docker not installed. Required for production deployment."
fi

echo ""
echo "Tooling verification complete!"
