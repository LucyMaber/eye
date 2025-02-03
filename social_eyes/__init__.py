"""
social_eyes package

Exports:
    - build_url: Construct a URL from a mapping key and value.
    - run_node_cli: Run the Node CLI tool with the provided URL.
    - validate_url: Validate that a string is a properly formed URL.
    - main: Command-line entry point for the package.
"""

from .shinigami_eyes_lib import build_url, run_node_cli, validate_url, main
