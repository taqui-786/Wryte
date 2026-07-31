import json
import os
from dotenv import load_dotenv
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langgraph.graph import StateGraph, START
from langgraph.graph.message import add_messages
from typing import TypedDict, Annotated
from pydantic import BaseModel, Field
# from langchain_openrouter import ChatOpenRouter
from langchain_openai import ChatOpenAI
from tinyfish import TinyFish
from langchain_core.messages import SystemMessage, HumanMessage

from pprint import pprint
from langchain_core.tools import  tool

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))




client = TinyFish(api_key=os.getenv("TINYFISH_API_KEY"))
# ── LLM ──────────────────────────────────────────────────────────────────────
# llm = ChatNVIDIA(
#     model="qwen/qwen3.5-397b-a17b",
#     api_key=os.getenv("NVIDIA_API_KEY"),
#     temperature=0,
#     top_p=0.95,
#     max_completion_tokens=16384,
#     # model_kwargs={"enable_thinking": False},
# )

testing = ChatOpenAI(
    model="mistralai/mistral-small-4-119b-2603",
    base_url="https://integrate.api.nvidia.com/v1/chat/completions",
    api_key=os.getenv("NVIDIA_API_KEY"),
    # reasoning_effort="low"
)
# llm_testing = ChatOpenAI(
#     base_url="https://openrouter.ai/api/v1",
#     model="qwen/qwen3.7-flash",
#     stream_usage=True,
# )
llm = ChatOpenAI(
    base_url="https://api.deepinfra.com/v1/openai",
    api_key=os.getenv("DEEPINFRA_API_KEY"),
    model="deepseek-ai/DeepSeek-V4-Flash",
    temperature=0.7,
    stream_usage=True,
    max_completion_tokens=16384,
    reasoning_effort="low",
    # extra_body={"provider": {"only": ["deepinfra/fp4"]}},
)
# ── Graph ─────────────────────────────────────────────────────────────────────
class State(TypedDict):
    messages: Annotated[list[BaseModel], add_messages]


def chat_node(state: State):
    res = llm.invoke(state["messages"])
    return {"messages": [res]}


graph = (
    StateGraph(State)
    .add_node("chat_node", chat_node)
    .add_edge(START, "chat_node")
    .compile()
)



@tool
def multiply(a: int, b: int) -> int:
    """Multiply two numbers."""
    return a * b


def test_opencode_model():
    """Quick test for the opencode/deepseek-v4-flash-free model"""
    print("--- Testing opencode/deepseek-v4-flash-free ---")
    # response = client.search.query(query="glm-5.2 benchmark", location="US")
    # if not response or not response.results:
    #     return f"No search results found for query: {query}"
    
    # top_urls = [r.url for r in response.results[:3]]
    # pages = client.fetch.get_contents(urls=top_urls, format="markdown")
        
    # raw_texts = []
    # for p in pages.results:
    #     text = getattr(p, "text", "") or getattr(p, "content", "") or ""
    #     if text:
    #         raw_texts.append(f"Source URL: {p.url}\nTitle: {p.title}\n{text[:3000]}")
    
    # combined = "\n\n---\n\n".join(raw_texts)
    # if not combined:
    #     return f"No readable content found for query: {query}"
    llm_with_tool = llm.bind_tools([multiply])
    response = llm_with_tool.invoke([SystemMessage(content="You are a helpful assistant. you have tools 'multiply' to multiply two numbers."), HumanMessage(content="What is 2 * 3?")])
    pprint(f"Response: {response}")
    print("--- Test complete ---")


test_opencode_model()