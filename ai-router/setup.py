from setuptools import setup, find_packages

setup(
    name="ai-router",
    version="1.0.0",
    description="Lightweight AI Gateway - OpenAI-compatible proxy for multi-provider LLM routing",
    packages=find_packages(),
    install_requires=[
        "fastapi>=0.104.0",
        "uvicorn[standard]>=0.24.0",
        "httpx>=0.25.0",
        "pyyaml>=6.0",
        "pydantic>=2.0",
        "jinja2>=3.0",
    ],
    entry_points={
        "console_scripts": [
            "ai-router=ai_router.__main__:main",
        ],
    },
    python_requires=">=3.9",
)
