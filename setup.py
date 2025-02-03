from setuptools import setup, find_packages
import subprocess
import sys
from setuptools.command.install import install

class CheckNode(install):
    """Custom installation command to check that Node.js is installed."""
    def run(self):
        try:
            # Attempt to run 'node --version' to verify Node.js is installed.
            result = subprocess.run(
                ['node', '--version'],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            print("Found Node.js version:", result.stdout.strip())
        except Exception as e:
            sys.exit("Error: Node.js is required but not installed or not available in PATH. "
                     "Please install Node.js before installing this package.")
        # Continue with the regular installation process.
        install.run(self)

setup(
    name="social_eyes",
    version="0.1.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="A tool to check social media identifiers using Node CLI and bloom filters.",
    long_description=open("README.md").read() if "README.md" in open("README.md").read() else "",
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/social_eyes",  # Update with your repository URL.
    packages=find_packages(),
    include_package_data=True,  # Include package data as specified in MANIFEST.in.
    package_data={
        # Include all files in the shinigami_eyes folder.
        "social_eyes": ["shinigami_eyes/**"]
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.6",
    install_requires=[
        # List any required Python packages here.
    ],
    cmdclass={
        # Use our custom install command to check for Node.js.
        'install': CheckNode,
    },
    entry_points={
        # This will create a console script named "social_eyes" that calls main().
        "console_scripts": [
            "social_eyes=social_eyes.shinigami_eyes_lib:main",
        ],
    },
)
