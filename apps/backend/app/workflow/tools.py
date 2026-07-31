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



from dataclasses import dataclass
from typing import Literal

class EditIntent(BaseModel):
    operation: Literal[
        "find_replace",
        "replace_section",
        "insert_after",
        "insert_before",
        "append_to_section",
        "delete_section",
        "replace_document",
        "clear",
    ] = Field(description="The edit operation to perform.")

    target: str = Field(
        default="",
        description=(
            "What to target. Meaning depends on operation:\n"
            "- find_replace: the exact text snippet to find in the document\n"
            "- replace_section/delete_section: heading text (without # prefix)\n"
            "- insert_after/insert_before/append_to_section: heading text to anchor on\n"
            "- replace_document/clear: leave empty"
        ),
    )

    content: str = Field(
        default="",
        description="The new/replacement markdown content. Omit for delete_section and clear.",
    )


class EditDocumentInput(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    intents: list[EditIntent] = Field(
        description="List of structured edit intents to apply to the document."
    )
    state: Annotated[dict[str, Any], InjectedState()] | None = Field(
        default=None,
        description="Injected graph state. Not provided by the model.",
    )


@dataclass
class Block:
    type: str  # "heading", "paragraph", "code_block", "blockquote", etc.
    text: str
    heading_level: int = 0
    heading_text: str = ""


def parse_blocks(markdown: str) -> list[Block]:
    """Split markdown into blocks while keeping code fences intact."""
    lines = markdown.split("\n")
    blocks: list[Block] = []
    current_lines: list[str] = []
    in_code_fence = False

    def flush_block():
        if not current_lines:
            return
        block_text = "\n".join(current_lines).strip()
        if not block_text:
            current_lines.clear()
            return

        if block_text.startswith("```"):
            blocks.append(Block(type="code_block", text=block_text))
        elif block_text.startswith("#"):
            first_line = block_text.split("\n")[0]
            level = 0
            for char in first_line:
                if char == "#":
                    level += 1
                else:
                    break
            h_text = first_line[level:].strip()
            blocks.append(
                Block(
                    type="heading",
                    text=block_text,
                    heading_level=level,
                    heading_text=h_text,
                )
            )
        elif block_text.startswith(">"):
            blocks.append(Block(type="blockquote", text=block_text))
        else:
            blocks.append(Block(type="paragraph", text=block_text))
        current_lines.clear()

    for line in lines:
        if line.strip().startswith("```"):
            in_code_fence = not in_code_fence
            current_lines.append(line)
            if not in_code_fence:
                flush_block()
            continue

        if in_code_fence:
            current_lines.append(line)
            continue

        if not line.strip():
            flush_block()
        else:
            current_lines.append(line)

    flush_block()
    return blocks


def get_available_headings(blocks: list[Block]) -> list[str]:
    return [b.heading_text for b in blocks if b.type == "heading" and b.heading_text]


def resolve_and_apply(
    markdown: str, intents: list[EditIntent]
) -> tuple[str, list[str], list[str]]:
    applied: list[str] = []
    errors: list[str] = []
    current_md = markdown

    for idx, intent in enumerate(intents):
        op = intent.operation
        target = intent.target.strip()
        content = intent.content.strip()

        if op == "clear":
            current_md = ""
            applied.append(f"Intent {idx+1}: cleared editor")
            continue

        if op == "replace_document":
            current_md = content
            applied.append(f"Intent {idx+1}: replaced full document")
            continue

        if op == "find_replace":
            if not target:
                errors.append(f"Intent {idx+1}: 'target' string is required for find_replace.")
                continue
            if target not in current_md:
                # Try case-insensitive search for better feedback
                low_md = current_md.lower()
                low_target = target.lower()
                if low_target in low_md:
                    # Find exact original casing
                    start_idx = low_md.find(low_target)
                    matched_orig = current_md[start_idx : start_idx + len(target)]
                    current_md = current_md.replace(matched_orig, content, 1)
                    applied.append(f"Intent {idx+1}: replaced '{matched_orig}' with new text")
                else:
                    errors.append(
                        f"Intent {idx+1}: target text snippet '{target[:40]}...' not found in document."
                    )
                continue
            count = current_md.count(target)
            if count > 1:
                errors.append(
                    f"Intent {idx+1}: target text snippet '{target[:30]}...' is ambiguous ({count} matches). Provide more surrounding context."
                )
                continue

            current_md = current_md.replace(target, content, 1)
            applied.append(f"Intent {idx+1}: find_replace succeeded for '{target[:30]}'")
            continue

        # Section operations
        blocks = parse_blocks(current_md)
        avail_headings = get_available_headings(blocks)

        if not target:
            errors.append(f"Intent {idx+1}: 'target' heading text is required for operation '{op}'.")
            continue

        # Find matching heading block
        target_h_idx = -1
        for i, b in enumerate(blocks):
            if b.type == "heading" and (
                b.heading_text.lower() == target.lower()
                or b.heading_text.lower().startswith(target.lower())
            ):
                target_h_idx = i
                break

        if target_h_idx == -1:
            errors.append(
                f"Intent {idx+1}: Heading target '{target}' not found. Available headings: {avail_headings or 'None'}"
            )
            continue

        target_block = blocks[target_h_idx]
        target_level = target_block.heading_level

        # Determine section end (next heading of same or higher level)
        section_end_idx = len(blocks)
        for i in range(target_h_idx + 1, len(blocks)):
            b = blocks[i]
            if b.type == "heading" and b.heading_level <= target_level:
                section_end_idx = i
                break

        if op == "delete_section":
            new_blocks = blocks[:target_h_idx] + blocks[section_end_idx:]
            current_md = "\n\n".join(b.text for b in new_blocks)
            applied.append(f"Intent {idx+1}: deleted section '{target_block.heading_text}'")

        elif op == "replace_section":
            replacement_blocks = parse_blocks(content)
            new_blocks = (
                blocks[:target_h_idx] + replacement_blocks + blocks[section_end_idx:]
            )
            current_md = "\n\n".join(b.text for b in new_blocks)
            applied.append(f"Intent {idx+1}: replaced section '{target_block.heading_text}'")

        elif op == "insert_after":
            new_blocks = (
                blocks[:section_end_idx]
                + parse_blocks(content)
                + blocks[section_end_idx:]
            )
            current_md = "\n\n".join(b.text for b in new_blocks)
            applied.append(f"Intent {idx+1}: inserted content after section '{target_block.heading_text}'")

        elif op == "insert_before":
            new_blocks = (
                blocks[:target_h_idx]
                + parse_blocks(content)
                + blocks[target_h_idx:]
            )
            current_md = "\n\n".join(b.text for b in new_blocks)
            applied.append(f"Intent {idx+1}: inserted content before section '{target_block.heading_text}'")

        elif op == "append_to_section":
            new_blocks = (
                blocks[:section_end_idx]
                + parse_blocks(content)
                + blocks[section_end_idx:]
            )
            current_md = "\n\n".join(b.text for b in new_blocks)
            applied.append(f"Intent {idx+1}: appended to section '{target_block.heading_text}'")

    return current_md, applied, errors


@tool(args_schema=EditDocumentInput)
def edit_document(
    intents: list[EditIntent],
    tool_call_id: Annotated[str, InjectedToolCallId] = "",
    state: Annotated[dict[str, Any], InjectedState()] | None = None,
) -> Command:
    """Apply targeted, token-efficient edits to the editor document.

    RULES:
    - Always call `read_editor` first to see the current content and headings.
    - Use `find_replace` for small text/word/phrase fixes (target=exact text snippet).
    - Use `replace_section`, `insert_after`, `insert_before`, `delete_section` for section-level changes (target=heading text).
    - Use `replace_document` or `clear` ONLY when replacing or clearing the entire editor.
    """
    current = (state or {}).get("editor_content", "") or ""
    new_content, applied, errors = resolve_and_apply(current, intents)

    summary_parts = []
    if applied:
        summary_parts.append(f"Applied: {'; '.join(applied)}")
    if errors:
        summary_parts.append(f"Errors: {'; '.join(errors)}")

    message_str = " ".join(summary_parts) or "No changes applied."

    return Command(
        update={
            "editor_content": new_content,
            "messages": [
                ToolMessage(
                    content=message_str,
                    tool_call_id=tool_call_id,
                    artifact=new_content,
                )
            ],
        }
    )


my_tools = [search_agent, scrape_url, read_editor, edit_document]
llm_with_tools = llm.bind_tools(my_tools)
tool_node = ToolNode(my_tools) 
