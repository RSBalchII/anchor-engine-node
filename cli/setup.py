from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="ece-cli",
    version="1.0.0",
    author="ECE Development Team",
    author_email="",
    description="Command-Line Interface for the External Context Engine",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/your-org/ece",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "httpx>=0.24.0",
        "rich>=13.0.0",
        "pydantic>=1.8.0",
    ],
    entry_points={
        "console_scripts": [
            "ece-cli=cli.ece_cli:main",
        ],
    },
)