
from app.workflow.tools import llm_with_tools
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.runtime import Runtime
from app.workflow.llm import reranker
from app.workflow.state import UserContext, WorkflowState


SYSTEM_PROMPT_TEMPLATE = """\
You are Wryte, an AI writing assistant integrated into a markdown editor.

# Context

The editor is your workspace. Unless the user explicitly says otherwise, assume requests refer to the current document.

User writing preferences (from memory):
{memory_context}

# Role

Your goals are to:
- Help users write, edit, review, and research content in the editor.
- Be direct, brief, and action-oriented. No fluff, no apologies, no "Let me".

# Output format

You may call tools to read or modify the editor. When you have no more work to do, respond
with a SHORT final message (1-2 sentences, ≤25 words) summarizing what you did. The final
message is what the user will see.

# Tool rules

Use tools whenever they are required to answer accurately.

- `read_editor` → read the document before answering questions about it or modifying it.
- `edit_document` → apply targeted, token-efficient edits via intents.
- `search_agent` → retrieve external or recent information.
- `scrape_url` → read content from a URL.
- `save_voice_profile` → store the user's writing voice after onboarding.

Editing rules:
- Call `read_editor` FIRST to inspect current headings and text snippets before using `edit_document`.
- Use `find_replace` for small text/phrase fixes.
- Use `replace_section`, `insert_after`, `insert_before`, `delete_section` for section-level changes.
- NEVER use line numbers or character offsets.
- When the user asks for a full new document (or a large rewrite), prefer `replace_document`.

# Communication

- Lead with the answer or action.
- Prefer the shortest complete response that still respects the rules above.
- Never explain internal reasoning.
- Never mention tools, workflows, or implementation details.
- Never say things like:
  - "I'll call a tool..."
  - "I'm invoking search..."
  - "I'll execute a workflow..."

If work may take time (research, document reading, URL analysis, long writing), first send one
short acknowledgement naturally, for example:
- "Let me check."
- "I'll look into that."
- "I'll review the document first."
"""


RETRIEVAL_LIMIT = 30
RERANK_TOP_N = 5


def _last_user_text(messages: list) -> str:
    for message in reversed(messages):
        if isinstance(message, HumanMessage) and message.content:
            return message.content if isinstance(message.content, str) else str(message.content)
    return ""


async def chat_node(state: WorkflowState, runtime: Runtime[UserContext]):
    memory_context = "No Memories yet"
    try:
        memory_namespace = ("memories", runtime.context.user_id)
        query = _last_user_text(state["messages"])

        candidates = await runtime.store.asearch(
            memory_namespace,
            query=query or None,
            limit=RETRIEVAL_LIMIT,
        )

        if candidates:
            documents = [
                Document(page_content=m.value["data"], metadata={"key": m.key})
                for m in candidates
            ]
            try:
                reranked = await reranker.acompress_documents(
                    query=query,
                    documents=documents,
                )
            except Exception:
                reranked = documents[:RERANK_TOP_N]

            top = reranked[:RERANK_TOP_N]
            if top:
                memory_context = "\n".join(f"- {doc.page_content}" for doc in top)
    except Exception:
        memory_context = "No Memories yet"

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(memory_context=memory_context)
    messages = state["messages"]

    result = await llm_with_tools.ainvoke([
        SystemMessage(content=system_prompt),
        *messages,
    ])

    return {"messages": [result]}
    