from langchain_nvidia_ai_endpoints import ChatNVIDIA, NVIDIAEmbeddings
from langchain_openai import ChatOpenAI

from app.config import settings
# llm = ChatNVIDIA(
#     model="minimaxai/minimax-m3",
#     api_key=settings.NVIDIA_API_KEY,
#     temperature=1,
#     top_p=0.95,
#     max_completion_tokens=16384,

#     # model_kwargs={"reasoning": True, "reasoning_budget": 3000},
# )
llm = ChatOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY,
    model="deepseek/deepseek-v4-flash",
    stream_usage=True,
    reasoning={
        "effort": "low"
    },
    extra_body={
    "provider": {
        "only": ["deepinfra/fp4"]
    }
}
)

llm_powerfull = ChatNVIDIA(
    model="qwen/qwen3.5-397b-a17b",
    api_key=settings.NVIDIA_API_KEY,
    temperature=0,
    top_p=0.95,
    max_completion_tokens=16384,
    model_kwargs={"enable_thinking": False},
)

llm_secondary = ChatNVIDIA(
    model="minimaxai/minimax-m3",
    api_key=settings.NVIDIA_API_KEY,
    temperature=0.3,
    max_completion_tokens=8192,
    # model_kwargs={"enable_thinking": False},
)
llm_structure = ChatOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY,
    model="deepseek/deepseek-v4-flash",
    stream_usage=False,
    reasoning={
        "effort": "low"
    },
    extra_body={
    "provider": {
        "only": ["deepinfra/fp4"]
        }
    },
    temperature=0,
    max_completion_tokens=8192,
)

EMBEDDING_DIMS = 1024
embeddings = NVIDIAEmbeddings(
    model="nvidia/nv-embedqa-e5-v5",
    api_key=settings.NVIDIA_API_KEY,
    truncate="END",
)
