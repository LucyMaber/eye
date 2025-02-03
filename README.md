# Social Eyes

**Social Eyes** is a tool that checks social media identifiers against pre-built Bloom filters using a Node.js CLI. It can label identifiers as either _transphobic_ or _t‑friendly_, and it provides exit codes for easy integration into other workflows. In addition, it includes a Python library to wrap the Node.js CLI, allowing you to use it both as a standalone command-line tool and as an importable package.

## Features

- **Mapping Support:** Construct URLs from social media mapping keys such as `Medium_username`, `mastodon_address`, etc.
- **Mastodon Integration:** Automatically sets the mastodon flag when using the `mastodon_address` key.
- **Exit Code Handling:** The Node.js CLI exits with:
  - Exit code **3**: Identifier is _transphobic_.
  - Exit code **2**: Identifier is _t‑friendly_.
  - Exit code **0**: No label.
- **Python Library:** Use the package as a library for integration into other Python projects.
- **Node.js Check:** Installation ensures that Node.js is available on your system.

## Directory Structure

