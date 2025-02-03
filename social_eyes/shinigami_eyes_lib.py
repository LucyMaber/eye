#!/usr/bin/env python3
"""
shinigami_eyes_lib.py

A library for running the Node CLI tool with optional mapping support.

This module provides functions to:
  - Validate URLs.
  - Construct URLs from mapping keys (e.g. "Medium_username", "mastodon_address", etc.).
  - Run the Node CLI tool and propagate its exit code.
  - Serve as a command-line entry point.
"""

import subprocess
import sys
import logging
from urllib.parse import urlparse

# Configure logging.
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# Mapping of keys to URL templates.
EYE_DICT = {
    "Medium_username": "https://medium.com/{value}",
    "youtube_channel_id": "https://www.youtube.com/channel/{value}",
    "YouTube_handle": "https://www.youtube.com/{value}",
    "Facebook_username": "https://www.facebook.com/{value}",
    "Facebook_page_ID": "https://www.facebook.com/pages/{value}",
    "Facebook_numeric_ID": "https://www.facebook.com/{value}",
    "Bluesky_handle": "https://bsky.app/profile/{value}",
    "Bluesky_DID": "https://bsky.app/profile/{value}",
    "Reddit_username": "https://www.reddit.com/user/{value}",
    "subreddit": "https://www.reddit.com/r/{value}",
    # For mastodon_address, the value is expected in the format "username@domain"
    "mastodon_address": "https://{domain}/@{username}",
    "tumblr_username": "https://{value}.tumblr.com/",
}


def validate_url(input_url: str) -> bool:
    """
    Perform a basic check to see if the input string is a URL.
    """
    try:
        result = urlparse(input_url)
        return all([result.scheme, result.netloc])
    except Exception as e:
        logging.error("URL validation error: %s", e)
        return False


def build_url(mapping_key: str, value: str) -> str:
    """
    Construct a URL based on a mapping key and a value.
    
    For example:
      build_url("Medium_username", "someUserName") returns "https://medium.com/someUserName"
    
    For the mapping key "mastodon_address", the value must be in the form "username@domain".
    """
    if mapping_key not in EYE_DICT:
        raise ValueError(f"Mapping key '{mapping_key}' not recognized. Valid keys: {list(EYE_DICT.keys())}")

    template = EYE_DICT[mapping_key]
    if mapping_key == "mastodon_address":
        try:
            username, domain = value.split('@', 1)
        except Exception as e:
            raise ValueError("For mastodon_address, value must be in the format username@domain") from e
        return template.format(username=username, domain=domain)
    else:
        return template.format(value=value)


def run_node_cli(url: str, is_mastodon: bool) -> int:
    """
    Run the Node CLI tool (located at ./shinigami_eyes/index.js) using the provided URL and flag.
    
    The Node CLI exits with:
      - 3 for "transphobic"
      - 2 for "t‑friendly"
      - 0 for no label.
    
    This function returns the Node CLI exit code.
    """
    command = ['node', './shinigami_eyes/index.js', url]
    if is_mastodon:
        command.append('--mastodon')
    
    logging.debug("Running command: %s", " ".join(command))
    
    try:
        result = subprocess.run(command, capture_output=True, text=True)
        
        # Print stdout and stderr.
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        
        # Propagate the Node CLI exit code.
        if result.returncode not in (0, 2, 3):
            logging.error("Node CLI exited with unexpected code %s", result.returncode)
        else:
            if result.returncode == 2:
                logging.info("Label determined as t‑friendly")
            elif result.returncode == 3:
                logging.info("Label determined as transphobic")
        return result.returncode
    except FileNotFoundError:
        logging.error("Node.js or the CLI script not found. Please ensure Node is installed and './shinigami_eyes/index.js' exists.")
        return 1
    except Exception as e:
        logging.error("Error running Node CLI: %s", e)
        return 1


def main(args: list = None) -> int:
    """
    Command-line entry point.
    
    Usage:
      python shinigami_eyes_lib.py <url> [--mastodon]
      or:
      python shinigami_eyes_lib.py <mapping_key> <value> [--mastodon]
    """
    if args is None:
        args = sys.argv[1:]
    
    if not args:
        print("Usage: python shinigami_eyes_lib.py <url> [--mastodon]")
        print("   or: python shinigami_eyes_lib.py <mapping_key> <value> [--mastodon]")
        return 1
    
    # Default value for the mastodon flag.
    is_mastodon = False

    # Check if the first argument is one of our mapping keys.
    if args[0] in EYE_DICT:
        if len(args) < 2:
            print("Usage for mapping: python shinigami_eyes_lib.py <mapping_key> <value> [--mastodon]")
            return 1
        mapping_key = args[0]
        mapping_value = args[1]
        try:
            input_url = build_url(mapping_key, mapping_value)
        except ValueError as e:
            logging.error(e)
            return 1
        # For mastodon_address, automatically set is_mastodon.
        if mapping_key == "mastodon_address":
            is_mastodon = True
        remaining_args = args[2:]
    else:
        input_url = args[0]
        remaining_args = args[1:]
    
    # Check for the '--mastodon' flag in the remaining arguments.
    if '--mastodon' in remaining_args:
        is_mastodon = True
    
    if not validate_url(input_url):
        logging.error("Invalid URL provided: %s", input_url)
        return 1

    exit_code = run_node_cli(input_url, is_mastodon)
    return exit_code


# If run as a script, use the main() function.
if __name__ == "__main__":
    sys.exit(main())
