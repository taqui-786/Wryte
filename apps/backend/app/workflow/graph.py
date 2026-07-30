from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph
from langgraph.store.postgres.aio import AsyncPostgresStore
from langgraph.prebuilt import tools_condition
from app.workflow.nodes.chat_node import chat_node
from app.workflow.nodes.memory_save_node import extract_and_save_memory_node
from app.workflow.router import need_plan_router
from app.workflow.state import UserContext, WorkflowState
from app.workflow.tools import tool_node

def build_graph(
    checkpointer=AsyncPostgresSaver, store=AsyncPostgresStore
) -> CompiledStateGraph:
    builder = StateGraph(WorkflowState, context_schema=UserContext)

    builder.add_node("chat", chat_node)
    builder.add_node("need_plan_router", need_plan_router)
    builder.add_node("memory_save", extract_and_save_memory_node)
    builder.add_node("tools", tool_node)

    builder.add_edge(START, "chat")
    builder.add_edge(START, "memory_save")

    builder.add_conditional_edges(
    "chat",
    tools_condition,
    {
        "tools": "tools",
        "__end__": "need_plan_router",
    },
)

    builder.add_edge("tools", "chat")

    builder.add_edge("need_plan_router", END)
    builder.add_edge("memory_save", END)

    return builder.compile(
        checkpointer=checkpointer,
        store=store,
    )
