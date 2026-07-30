from typing import Annotated, Any
from langchain_core.messages import ToolMessage
from langchain_core.tools import InjectedToolCallId, tool
from langgraph.prebuilt import InjectedState,ToolNode
from langgraph.types import Command
from app.workflow.llm import llm, llm_lightweight
from pydantic import BaseModel, ConfigDict, Field
from tinyfish import TinyFish

from app.config import settings

client = TinyFish(api_key=settings.TINYFISH_API_KEY)


class ReadEditorInput(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    state: Annotated[dict[str, Any], InjectedState()] | None = Field(
        default=None,
        description="Injected graph state. Not provided by the model.",
    )


@tool(args_schema=ReadEditorInput)
def read_editor(
    state: Annotated[dict[str, Any], InjectedState],
) -> str:
    """Read the full current content of the user's markdown editor.
    Use this whenever you need to see what the user is currently writing
    before you can help them (summarize, edit, review, continue, etc.).
    Returns the editor content as a single markdown string.
    """
    content = state.get("editor_content", "") or ""
    if not content.strip():
        return "The editor is currently empty."
    return content




@tool
async def search_agent(query: str) -> str:
    """Search the web for information. Always use this tool whenever you need
    current information or real-time data. Give a short query as input."""
    try:
        response = client.search.query(query=query, location="US")
        if not response or not response.results:
            return f"No search results found for query: {query}"
        
        top_urls = [r.url for r in response.results[:3]]
        pages = client.fetch.get_contents(urls=top_urls, format="markdown")
        
        raw_texts = []
        for p in pages.results:
            text = getattr(p, "text", "") or getattr(p, "content", "") or ""
            if text:
                raw_texts.append(f"Source URL: {p.url}\nTitle: {p.title}\n{text[:3000]}")
        
        combined = "\n\n---\n\n".join(raw_texts)
        if not combined:
            return f"No readable content found for query: {query}"

        # Summarize search results using lightweight model to save tokens
        summary = await llm_lightweight.ainvoke(
            f"Summarize the key facts and insights from these web search results for the user query '{query}'. Keep it concise and factual:\n\n{combined[:8000]}"
        )
        return str(summary.content)
    except Exception as e:
        return f"Search error: {str(e)}"


@tool
async def scrape_url(url: str) -> str:
    """Scrape a URL for information. Always use this tool whenever you need
    to fetch a URL and get its content."""
    try:
        page = client.fetch.get_contents(urls=[url], format="markdown")
        if not page or not page.results:
            return f"Could not fetch content from {url}"
        
        first = page.results[0]
        text = getattr(first, "text", "") or getattr(first, "content", "") or ""
        if not text:
            return f"Empty page content at {url}"

        # Summarize scraped URL content using lightweight model if long
        if len(text) > 1500:
            summary = await llm_lightweight.ainvoke(
                f"Extract the main article/page contents from this document URL {url}. Keep it well structured and concise:\n\n{text[:10000]}"
            )
            return str(summary.content)
        return text
    except Exception as e:
        return f"Scrape error: {str(e)}"



class EditorChange(BaseModel):
    line: int = Field(default=1, description="1-indexed block-level line number (ignored for clear/replace_all)")
    type: str = Field(
        description="replace=swap content at line, delete=remove line, insert=add new content AFTER line, clear=wipe entire editor, replace_all=overwrite whole document"
    )
    content: str = Field(default="", description="New content (for replace/insert/replace_all). Empty string for delete/clear.")


class UpdateEditorInput(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    changes: list[EditorChange] = Field(
        description="List of line-level changes, or single clear/replace_all change."
    )
    state: Annotated[dict[str, Any], InjectedState()] | None = Field(
        default=None,
        description="Injected graph state. Not provided by the model.",
    )


@tool(args_schema=UpdateEditorInput)
def update_editor(
    changes: list[EditorChange],
    tool_call_id: Annotated[str, InjectedToolCallId] = "",
    state: Annotated[dict[str, Any], InjectedState()] | None = None,
) -> Command:
    """Apply targeted changes or full document operations to the editor content.

    RULES:
    - To clear/wipe the editor: use `changes: [{"type": "clear", "line": 1, "content": ""}]`.
    - To replace the whole document: use `changes: [{"type": "replace_all", "line": 1, "content": "..."}]`.
    - To edit specific lines: call `read_editor` FIRST to get line numbers, then return 1-3 targeted `replace`/`insert`/`delete` changes.
    """
    current = (state or {}).get("editor_content", "") or ""
    new_content = _apply_changes_to_markdown(current, changes)

    return Command(
        update={
            "editor_content": new_content,
            "messages": [
                ToolMessage(
                    f"Applied {len(changes)} change(s) to editor.",
                    tool_call_id=tool_call_id,
                )
            ],
        }
    )


def _apply_changes_to_markdown(markdown: str, changes: list[EditorChange | dict]) -> str:
    normalized: list[EditorChange] = []
    for c in changes:
        if isinstance(c, dict):
            normalized.append(
                EditorChange(
                    line=c.get("line", 1),
                    type=c.get("type", "replace"),
                    content=c.get("content", ""),
                )
            )
        else:
            normalized.append(c)

    # Check for clear or replace_all operations
    for c in normalized:
        if c.type == "clear":
            return ""
        if c.type == "replace_all":
            return c.content

    if not markdown.strip():
        inserts = [c for c in normalized if c.type in ["insert", "replace"]]
        return "\n\n".join(c.content for c in inserts)

    blocks = markdown.split("\n\n")
    while blocks and blocks[-1] == "":
        blocks.pop()

    deletes_replaces = [c for c in normalized if c.type not in ["insert", "clear", "replace_all"]]
    inserts = [c for c in normalized if c.type == "insert"]

    for c in sorted(deletes_replaces, key=lambda x: -x.line):
        idx = c.line - 1
        if idx < 0 or idx >= len(blocks):
            continue
        if c.type == "delete":
            blocks.pop(idx)
        elif c.type == "replace":
            blocks[idx] = c.content

    for c in sorted(inserts, key=lambda x: x.line):
        idx = c.line
        if idx < 0:
            blocks.insert(0, c.content)
        elif idx >= len(blocks):
            blocks.append(c.content)
        else:
            blocks.insert(idx, c.content)

    return "\n\n".join(blocks)


my_tools = [search_agent, scrape_url, read_editor, update_editor]
llm_with_tools = llm.bind_tools(my_tools)
tool_node = ToolNode(my_tools) 
