from langchain_nvidia_ai_endpoints import ChatNVIDIA, NVIDIAEmbeddings
from langchain_openai import ChatOpenAI

from app.config import settings

# Fast, lightweight model for summarization, routing, memory extraction (low token cost)
llm_lightweight = ChatNVIDIA(
    model="meta/llama-3.1-8b-instruct",
    api_key=settings.NVIDIA_API_KEY,
    temperature=0.2,
)

# DeepSeek V4 models for primary chat, planning, and execution
llm = ChatOpenAI(
    # this is my Paid one
    # base_url="https://api.deepinfra.com/v1/openai",
    # api_key=settings.DEEPINFRA_API_KEY,
    # model="deepseek-ai/DeepSeek-V4-Flash",
    # This is Free One
    base_url="https://opencode.ai/zen/v1",
    api_key=settings.OPENCODE_API_KEY,
    model="deepseek-v4-flash-free", 
    temperature=0.7,
    stream_usage=True,
    max_completion_tokens=16384,
    reasoning_effort="medium",
)

llm_powerfull = ChatOpenAI(
    # this is my Paid one
    # base_url="https://api.deepinfra.com/v1/openai",
    # api_key=settings.DEEPINFRA_API_KEY,
    # model="deepseek-ai/DeepSeek-V4-Flash",
    # This is Free One
    base_url="https://opencode.ai/zen/v1",
    api_key=settings.OPENCODE_API_KEY,
    model="deepseek-v4-flash-free", 
    temperature=0.3,
    stream_usage=True,
    max_completion_tokens=16384,
)

llm_secondary = ChatOpenAI(
    # this is my Paid one
    # base_url="https://api.deepinfra.com/v1/openai",
    # api_key=settings.DEEPINFRA_API_KEY,
    # model="deepseek-ai/DeepSeek-V4-Flash",
    # This is Free One
    base_url="https://opencode.ai/zen/v1",
    api_key=settings.OPENCODE_API_KEY,
    model="deepseek-v4-flash-free", 
    temperature=0,
    stream_usage=False,
    max_completion_tokens=8192,
)

llm_structure = ChatOpenAI(
    # this is my Paid one
    base_url="https://api.deepinfra.com/v1/openai",
    api_key=settings.DEEPINFRA_API_KEY,
    model="deepseek-ai/DeepSeek-V4-Flash",
    # This is Free One
    # base_url="https://opencode.ai/zen/v1",
    # api_key=settings.OPENCODE_API_KEY,
    # model="deepseek-v4-flash-free", 
    stream_usage=False,
    temperature=0,
    max_completion_tokens=8192,
)

EMBEDDING_DIMS = 1024
embeddings = NVIDIAEmbeddings(
    model="nvidia/nv-embedqa-e5-v5",
    api_key=settings.NVIDIA_API_KEY,
    truncate="END",
)

