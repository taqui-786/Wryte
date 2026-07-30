
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.workflow.llm import llm_lightweight


async def need_plan_router(state: dict) -> dict:
    messages = state.get("messages", [])
    last_ai_msg = next(
        (m.content for m in reversed(messages) if isinstance(m, AIMessage)),
        "",
    )
    if not last_ai_msg:
        return {"need_plan": False}

    need_result = await llm_lightweight.ainvoke([
        SystemMessage("Reply with exactly one word: true or false."),
        HumanMessage(
            content=(
                "Does the following AI assistant message indicate that it needs to create a plan "
                "or is about to start planning before doing something?\n\n"
                f"{last_ai_msg}"
            )
        ),
    ])
    need_plan = need_result.content.strip().lower() == "true"

    return {"need_plan": need_plan}
